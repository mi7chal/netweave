use crate::integrations::{IntegrationProvider, IntegrationType};
use crate::models::{CreateServicePayload, CreateDevicePayload};
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

#[derive(Deserialize)]
struct AdGuardStatus {
    version: String,
}



#[derive(Deserialize)]
struct DhcpLease {
    mac: String,
    ip: String,
    hostname: String,
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

        Ok(Self {
            url,
            username,
            password_encrypted,
            client: Client::builder()
                .cookie_store(true)
                .danger_accept_invalid_certs(true) // Common in homelabs
                .build()?,
        })
    }

    async fn get_password(&self) -> Result<String> {
        if self.password_encrypted.is_empty() {
            return Ok("".to_string());
        }
        encryption::decrypt(&self.password_encrypted)
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

    async fn fetch_devices(&self) -> Result<Vec<CreateDevicePayload>> {
        self.ensure_authenticated().await?;
        let url = format!("{}/control/dhcp/status", self.url);
        let res = self.client.get(&url).send().await?;
        
        if !res.status().is_success() {
            return Err(anyhow::anyhow!("AdGuard fetch_devices failed: {}", res.status()));
        }

        let text = res.text().await?;
        let json: Value = serde_json::from_str(&text)
            .map_err(|e| anyhow::anyhow!("Failed to parse DHCP status: {} (Body: {})", e, text))?;
        
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
                     devices.push(CreateDevicePayload {
                         hostname: lease.hostname.clone(),
                         device_type: "Unknown".to_string(),
                         parent_device_id: None,
                         mac_address: Some(lease.mac.clone()),
                         ip_address: Some(lease.ip.clone()),
                         owner: None,
                         os_info: None,
                         cpu_cores: None,
                         ram_gb: None,
                         storage_gb: None,
                     });
                }
            }
        }
        
        // Also check static leases usually in 'static_leases'
        if let Some(static_leases) = json.get("static_leases").and_then(|l| l.as_array()) {
             for lease_val in static_leases {
                if let Ok(lease) = serde_json::from_value::<Lease>(lease_val.clone()) {
                     devices.push(CreateDevicePayload {
                         hostname: lease.hostname.clone(),
                         device_type: "Unknown".to_string(),
                         parent_device_id: None,
                         mac_address: Some(lease.mac.clone()),
                         ip_address: Some(lease.ip.clone()),
                         owner: None,
                         os_info: None,
                         cpu_cores: None,
                         ram_gb: None,
                         storage_gb: None,
                     });
                }
             }
        }

        Ok(devices)
    }
}
