use crate::integrations::{IntegrationProvider, IntegrationType, IntegrationDhcpLease, IntegrationNetwork};
use crate::models::CreateServicePayload;
use crate::utils::encryption;
use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;
use serde_json::Value;

pub struct AdGuardIntegration {
    url: String,
    username: String,
    password_encrypted: String, 
    client: Client,
}


impl AdGuardIntegration {
    pub fn new(config: &Value) -> Result<Self> {
        let mut url = config.get("url").and_then(|v| v.as_str()).context("Missing URL")?.trim_end_matches('/').to_string();
        
        // Ensure scheme
        if !url.starts_with("http://") && !url.starts_with("https://") {
            url = format!("http://{}", url);
        }

        let username = config.get("username").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let password_encrypted = config.get("password").and_then(|v| v.as_str()).unwrap_or("").to_string();

        let skip_tls_verify = config
            .get("skip_tls_verify")
            .and_then(|v| v.as_bool())
            .unwrap_or(true); // default true for homelab / self-signed certs

        Ok(Self {
            url,
            username,
            password_encrypted,
            client: Client::builder()
                .cookie_store(true)
                .danger_accept_invalid_certs(skip_tls_verify)
                .build()?,
        })
    }

    async fn get_password(&self) -> Result<String> {
        if self.password_encrypted.is_empty() {
            return Ok("".to_string());
        }
        
        // Try to decrypt, but provide helpful context on failure
        match encryption::decrypt(&self.password_encrypted) {
            Ok(pwd) => Ok(pwd),
            Err(e) => {
                tracing::error!(
                    "Failed to decrypt AdGuard password. This likely means:\n\
                     1. The password was encrypted with a different ENCRYPTION_KEY\n\
                     2. The password is stored as plain text (not encrypted)\n\
                     3. The encrypted data is corrupted\n\
                     Original error: {}",
                    e
                );
                
                // Try treating it as plain text as a fallback
                tracing::warn!("Attempting to use password as plain text (legacy/unencrypted)");
                Ok(self.password_encrypted.clone())
            }
        }
    }

    async fn login(&self) -> Result<()> {
        let password = self.get_password().await?;
        let login_url = format!("{}/control/login", self.url);
        
        let payload = serde_json::json!({
            "name": self.username,
            "password": password
        });

        tracing::debug!("Attempting AdGuard login to {}", login_url);

        let res = self.client.post(&login_url)
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            tracing::error!("AdGuard Login Failed: Status={}, Body={}", status, body);
            return Err(anyhow::anyhow!("AdGuard Login Failed: {} - {}", status, body));
        }

        tracing::info!("AdGuard login successful");
        Ok(())
    }

    async fn ensure_authenticated(&self) -> Result<()> {
         // Try a cheap call
         let status_url = format!("{}/control/status", self.url);
         let res = self.client.get(&status_url).send().await?;
         
         // If generic failure or unauthorized, attempt login
         if !res.status().is_success() || res.status() == 403 || res.status() == 401 {
             tracing::debug!("AdGuard session invalid (Status={}), re-authenticating...", res.status());
             self.login().await?;
         }
         Ok(())
    }
}

#[async_trait]
impl IntegrationProvider for AdGuardIntegration {
    fn provider_id(&self) -> &str {
        "adguard"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::AdGuardHome
    }

    async fn health_check(&self) -> Result<()> {
        self.ensure_authenticated().await?;
        Ok(())
    }

    async fn fetch_services(&self) -> Result<Vec<CreateServicePayload>> {
        // DNS fetching removed as per user request
        Ok(Vec::new())
    }

    async fn fetch_networks(&self) -> Result<Vec<IntegrationNetwork>> {
        self.ensure_authenticated().await?;
        let url = format!("{}/control/dhcp/status", self.url);
        let res = self.client.get(&url).send().await?;
        
        if !res.status().is_success() {
            tracing::warn!("AdGuard fetch_networks: DHCP might be disabled (Status={})", res.status());
            return Ok(Vec::new());
        }

        let json: Value = match res.json().await {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("AdGuard fetch_networks: Failed to parse JSON: {}", e);
                return Ok(Vec::new());
            }
        };
        tracing::info!("AdGuard DHCP status response keys: {:?}", json.as_object().map(|o| o.keys().collect::<Vec<_>>()));
        
        let mut networks = Vec::new();
        
        // Try to find gateway and mask in multiple possible nested objects (v4, conf, or top-level)
        let (gateway, mask) = if let Some(v4) = json.get("v4") {
            (
                v4.get("gateway_ip").and_then(|v| v.as_str()),
                v4.get("subnet_mask").and_then(|v| v.as_str())
            )
        } else if let Some(conf) = json.get("conf") {
            (
                conf.get("gateway_ip").and_then(|v| v.as_str()),
                conf.get("subnet_mask").and_then(|v| v.as_str())
            )
        } else {
            (
                json.get("gateway_ip").and_then(|v| v.as_str()),
                json.get("subnet_mask").and_then(|v| v.as_str())
            )
        };

        tracing::info!("AdGuard discovered stats: gateway={:?}, mask={:?}", gateway, mask);

        if let (Some(gateway), Some(mask)) = (gateway, mask) {
            if !gateway.is_empty() && !mask.is_empty() {
                // Calculate CIDR from gateway and mask
                if let (Ok(gw_ip), Ok(m_ip)) = (gateway.parse::<std::net::Ipv4Addr>(), mask.parse::<std::net::Ipv4Addr>()) {
                    let prefix = u32::from(m_ip).count_ones() as u8;
                    let network_addr = std::net::Ipv4Addr::from(u32::from(gw_ip) & u32::from(m_ip));
                    let cidr = format!("{}/{}", network_addr, prefix);
                    
                    tracing::info!("Discovered network from AdGuard: {} with CIDR {}", gateway, cidr);

                    networks.push(IntegrationNetwork {
                        name: format!("AdGuard Network {}", network_addr),
                        cidr,
                        gateway: Some(gateway.to_string()),
                        vlan_id: None,
                    });
                }
            }
        }
        
        Ok(networks)
    }

    async fn fetch_devices(&self) -> Result<Vec<IntegrationDhcpLease>> {
        self.ensure_authenticated().await?;
        let url = format!("{}/control/dhcp/status", self.url);
        let res = self.client.get(&url).send().await?;
        
        if !res.status().is_success() {
            tracing::warn!("AdGuard fetch_devices: DHCP might be disabled (Status={})", res.status());
            return Ok(Vec::new());
        }

        let text = res.text().await.unwrap_or_default();
        let json: Value = match serde_json::from_str(&text) {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("AdGuard fetch_devices: Failed to parse DHCP status JSON: {} (Body: {})", e, text);
                return Ok(Vec::new());
            }
        };
        
        // Define structs for reading - local to function to avoid clutter
        #[derive(Deserialize)] 
        struct Lease {
            mac: String,
            ip: String,
            hostname: String,
        }

        let mut devices = Vec::new();

        if let Some(leases) = json.get("leases").and_then(|l| l.as_array()) {
            for lease_val in leases {
                if let Ok(lease) = serde_json::from_value::<Lease>(lease_val.clone()) {
                     devices.push(IntegrationDhcpLease {
                         hostname: lease.hostname.clone(),
                         mac_address: lease.mac.clone(),
                         ip_address: lease.ip.clone(),
                         is_static: false,
                     });
                }
            }
        }
        
        // Also check static leases usually in 'static_leases'
        if let Some(static_leases) = json.get("static_leases").and_then(|l| l.as_array()) {
             for lease_val in static_leases {
                if let Ok(lease) = serde_json::from_value::<Lease>(lease_val.clone()) {
                     devices.push(IntegrationDhcpLease {
                         hostname: lease.hostname.clone(),
                         mac_address: lease.mac.clone(),
                         ip_address: lease.ip.clone(),
                         is_static: true,
                     });
                }
             }
        }

        Ok(devices)
    }

    async fn push_static_lease(&self, mac: &str, ip: &str, hostname: &str) -> Result<()> {
        self.ensure_authenticated().await?;
        
        let url = format!("{}/control/dhcp/add_static_lease", self.url);
        
        let payload = serde_json::json!({
            "mac": mac,
            "ip": ip,
            "hostname": hostname
        });

        let res = self.client.post(&url)
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            tracing::error!("AdGuard push_static_lease Failed: Status={}, Body={}", status, body);
            // Ignore 400 Bad Request if it already exists (usually body contains "already exists")
            if status == 400 && body.contains("already exists") {
                tracing::info!("Static lease already exists in AdGuard: {} - {}", mac, ip);
                return Ok(());
            }
            return Err(anyhow::anyhow!("AdGuard push_static_lease Failed: {} - {}", status, body));
        }

        tracing::info!("Successfully pushed static lease to AdGuard: {} -> {}", mac, ip);
        Ok(())
    }

    async fn delete_static_lease(&self, mac: &str, ip: &str, hostname: &str) -> Result<()> {
        self.ensure_authenticated().await?;
        
        let url = format!("{}/control/dhcp/remove_static_lease", self.url);
        
        let payload = serde_json::json!({
            "mac": mac,
            "ip": ip,
            "hostname": hostname
        });

        let res = self.client.post(&url)
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            tracing::error!("AdGuard delete_static_lease Failed: Status={}, Body={}", status, body);
            // Ignore 400 Bad Request if it does not exist
            if status == 400 {
                tracing::info!("Static lease might not exist in AdGuard to delete: {} - {}", mac, ip);
                return Ok(());
            }
            return Err(anyhow::anyhow!("AdGuard delete_static_lease Failed: {} - {}", status, body));
        }

        tracing::info!("Successfully deleted static lease from AdGuard: {} -> {}", mac, ip);
        Ok(())
    }
}
