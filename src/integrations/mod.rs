use crate::AppState;
use crate::entities::{integrations, devices, interfaces, ip_addresses};
use crate::models::CreateServicePayload;
use sea_orm::{ActiveModelTrait, EntityTrait, Set, ColumnTrait, QueryFilter, QuerySelect, Statement, DatabaseBackend, ConnectionTrait};
use tokio::time::{sleep, Duration};
use chrono::Utc;
use async_trait::async_trait;
use anyhow::Result;
use sea_orm::sea_query::{Expr, Alias};

pub mod adguard;

/// Represents the type of source integration
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IntegrationType {
    AdGuardHome,
    KeaDhcp,
    UnifiController,
    Custom(String),
}

#[derive(Debug, Clone)]
pub struct IntegrationDhcpLease {
    pub hostname: String,
    pub mac_address: String,
    pub ip_address: String,
    pub is_static: bool,
}

#[async_trait]
pub trait IntegrationProvider: Send + Sync {
    fn provider_id(&self) -> &str;
    fn integration_type(&self) -> IntegrationType;
    async fn health_check(&self) -> Result<()>;
    async fn fetch_services(&self) -> Result<Vec<CreateServicePayload>>;
    async fn fetch_devices(&self) -> Result<Vec<IntegrationDhcpLease>>;
    async fn push_static_lease(&self, mac: &str, ip: &str, hostname: &str) -> Result<()>;
    async fn delete_static_lease(&self, mac: &str, ip: &str, hostname: &str) -> Result<()>;
}

pub async fn run_sync_task(state: AppState) {
    tracing::info!("Starting integration sync task...");
    loop {
        if let Err(e) = sync_all_integrations(&state).await {
            tracing::error!("Integration sync cycle failed: {}", e);
        }
        sleep(Duration::from_secs(3600)).await;
    }
}

async fn sync_all_integrations(state: &AppState) -> Result<()> {
    let integrations = integrations::Entity::find().all(&state.conn).await?;

    for integration_model in integrations {
        // Update status to SYNCING
        let mut active: integrations::ActiveModel = integration_model.clone().into();
        active.status = Set(Some("SYNCING".to_string()));
        active.update(&state.conn).await.ok();

        match process_integration(state, &integration_model).await {
            Ok(_) => {
                let mut active: integrations::ActiveModel = integration_model.into();
                active.status = Set(Some("ACTIVE".to_string()));
                active.last_sync_at = Set(Some(Utc::now().into()));
                active.update(&state.conn).await?;
            }
            Err(e) => {
                tracing::error!("Failed to sync integration {}: {}", integration_model.name, e);
                let mut active: integrations::ActiveModel = integration_model.into();
                let err_msg = format!("ERROR: {}", e);
                // Truncate if too long (status is likely VARCHAR(255) typically)
                active.status = Set(Some(err_msg.chars().take(250).collect()));
                active.update(&state.conn).await.ok();
            }
        }
    }
    Ok(())
}

pub async fn process_integration(state: &AppState, model: &integrations::Model) -> Result<()> {
    // Factory: Create provider instance based on type
    let provider: Box<dyn IntegrationProvider> = match model.provider_type.as_str() {
        "AdGuardHome" => Box::new(adguard::AdGuardIntegration::new(&model.config)?),
        _ => return Err(anyhow::anyhow!("Unknown provider type: {}", model.provider_type)),
    };

    // 1. Sync Services (DNS Rewrites) - Removed as per user request (logic kept as no-op in adguard)
    let _ = provider.fetch_services().await?; 
    
    // 2. Sync Devices (DHCP Leases)
    let fetched_devices = provider.fetch_devices().await?;
    
    // Cache networks for IP matching
    // Use db abstraction which handles casting
    let all_networks = state.db.list_networks().await?;

    for payload in fetched_devices {
        let mac = payload.mac_address.to_lowercase();
        let ip_str = &payload.ip_address;
        
        // Skip IPv6 addresses as per configuration/user request
        if let Ok(std::net::IpAddr::V6(_)) = ip_str.parse::<std::net::IpAddr>() {
            continue;
        }

        // Check if Interface exists (Primary definition of device identity here)
        // Check if Interface exists (Primary definition of device identity here)
        let existing_interface = interfaces::Entity::find()
            .select_only()
            .column(interfaces::Column::Id)
            .column(interfaces::Column::DeviceId)
            .filter(Expr::col(interfaces::Column::MacAddress).eq(Expr::val(&mac).cast_as(Alias::new("macaddr"))))
            .into_tuple::<(uuid::Uuid, uuid::Uuid)>()
            .one(&state.conn)
            .await?;

        let device_id = match existing_interface {
            Some((_interface_id, device_id)) => {
                // Update Device info if needed
                if let Some(device) = devices::Entity::find_by_id(device_id).one(&state.conn).await? {
                    let mut active: devices::ActiveModel = device.into();
                    if active.hostname.clone().unwrap() != payload.hostname {
                         active.hostname = Set(payload.hostname.clone());
                         active.update(&state.conn).await.ok();
                    }
                    device_id
                } else {
                    // Orphaned interface? Should not happen with foreign keys, but just in case
                    continue; 
                }
            },
            None => {
                // Create New Device
                let new_device_id = uuid::Uuid::now_v7();
                let new_device = devices::ActiveModel {
                    id: Set(new_device_id),
                    hostname: Set(payload.hostname.clone()),
                    r#type: Set("OTHER".to_string()), 
                    created_at: Set(Utc::now().into()),
                    ..Default::default()
                };
                new_device.insert(&state.conn).await?;

                // Create Interface using DB method (handles MAC types)
                
                state.db.create_interface(new_device_id, crate::models::CreateInterfacePayload {
                    name: "eth0".to_string(),
                    mac_address: Some(mac.clone()),
                    interface_type: "ethernet".to_string(),
                }).await?;
                
                new_device_id
            }
        };

        let is_static_lease = payload.is_static;

        // Find matching network
        let matched_network = all_networks.iter().find(|n| {
            if let Ok(ip) = ip_str.parse::<std::net::IpAddr>() {
                return n.cidr.contains(ip);
            }
            false
        });

        if let Some(network) = matched_network {
            // Check if IP assignment exists
            // Let's cast IP to INET just to be safe.
            let existing_ip = ip_addresses::Entity::find()
            .select_only()
            .column(ip_addresses::Column::Id)
            .column(ip_addresses::Column::InterfaceId)
            .column(ip_addresses::Column::IsStatic)
            .filter(Expr::col(ip_addresses::Column::IpAddress).eq(Expr::val(ip_str).cast_as(Alias::new("inet"))))
            .into_tuple::<(uuid::Uuid, Option<uuid::Uuid>, bool)>()
            .one(&state.conn)
            .await?;

            let should_create = match existing_ip {
                None => true,
                Some((_, interface_id, _)) => interface_id.is_none(),
            };

            if should_create {
                // Get interface ID again (could have been created)
                let interface_id = interfaces::Entity::find()
                .select_only()
                .column(interfaces::Column::Id)
                .filter(Expr::col(interfaces::Column::MacAddress).eq(Expr::val(&mac).cast_as(Alias::new("macaddr"))))
                .into_tuple::<uuid::Uuid>()
                .one(&state.conn)
                .await?
                .ok_or_else(|| anyhow::anyhow!("Interface not found after creation/check"))?;

                use crate::db::CreateIpParams;
                use crate::models::IpStatus;
                use std::str::FromStr;

                state.db.create_ip(CreateIpParams {
                    network_id: network.id,
                    device_id: Some(device_id),
                    interface_id: Some(interface_id),
                    ip_address: ip_str.parse().unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0))),
                    mac_address: mac_address::MacAddress::from_str(&mac).ok(),
                    is_static: is_static_lease,
                    status: IpStatus::Active,
                    description: Some("Synced from Integration".to_string()),
                }).await?;
            } else {
                // Determine if we need to upgrade a dynamic lease to a static lease
                if let Some((ip_id, _, db_is_static)) = existing_ip {
                    if is_static_lease && !db_is_static {
                        tracing::info!("Upgrading existing IP {} to static based on integration sync.", ip_str);
                        let sql = "UPDATE ip_addresses SET is_static = true WHERE id = $1";
                        let stmt = Statement::from_sql_and_values(
                            DatabaseBackend::Postgres,
                            sql,
                            vec![ip_id.into()]
                        );
                        let _ = state.conn.execute(stmt).await;
                    }
                }
            }
        } else {
            tracing::warn!("Skipping IP sync for {}: No matching network found for IP {}", payload.hostname, ip_str);
        }
    }
    
    Ok(())
}

pub async fn trigger_static_lease_push(state: &AppState, mac: &str, ip: &str, hostname: &str) {
    let integrations_res = integrations::Entity::find()
        .filter(integrations::Column::Status.eq("ACTIVE"))
        .all(&state.conn)
        .await;

    if let Ok(active_integrations) = integrations_res {
        for model in active_integrations {
            let provider: Box<dyn IntegrationProvider> = match model.provider_type.as_str() {
                "AdGuardHome" => {
                    if let Ok(adg) = adguard::AdGuardIntegration::new(&model.config) {
                        Box::new(adg)
                    } else {
                        continue;
                    }
                },
                _ => continue,
            };

            if let Err(e) = provider.push_static_lease(mac, ip, hostname).await {
                tracing::error!("Failed to push static lease to integration {}: {}", model.name, e);
            }
        }
    }
}

pub async fn trigger_static_lease_delete(state: &AppState, mac: &str, ip: &str, hostname: &str) {
    let integrations_res = integrations::Entity::find()
        .filter(integrations::Column::Status.eq("ACTIVE"))
        .all(&state.conn)
        .await;

    if let Ok(active_integrations) = integrations_res {
        for model in active_integrations {
            let provider: Box<dyn IntegrationProvider> = match model.provider_type.as_str() {
                "AdGuardHome" => {
                    if let Ok(adg) = adguard::AdGuardIntegration::new(&model.config) {
                        Box::new(adg)
                    } else {
                        continue;
                    }
                },
                _ => continue,
            };

            if let Err(e) = provider.delete_static_lease(mac, ip, hostname).await {
                tracing::error!("Failed to delete static lease from integration {}: {}", model.name, e);
            }
        }
    }
}
