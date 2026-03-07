use crate::entities::{devices, integrations, interfaces, ip_addresses};
use crate::AppState;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use sea_orm::sea_query::{Alias, Expr};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseBackend, EntityTrait, QueryFilter,
    QuerySelect, Set, Statement,
};
use tokio::time::{sleep, Duration};

pub mod adguard;

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

#[derive(Debug, Clone)]
pub struct IntegrationNetwork {
    pub name: String,
    pub cidr: String,
    pub gateway: Option<String>,
    pub vlan_id: Option<i32>,
}

#[async_trait]
pub trait IntegrationProvider: Send + Sync {
    fn provider_id(&self) -> &str;
    fn integration_type(&self) -> IntegrationType;
    async fn health_check(&self) -> Result<()>;
    async fn fetch_services(&self) -> Result<Vec<crate::models::CreateServicePayload>>;
    async fn fetch_networks(&self) -> Result<Vec<IntegrationNetwork>>;
    async fn fetch_devices(&self) -> Result<Vec<IntegrationDhcpLease>>;
    async fn push_static_lease(&self, mac: &str, ip: &str, hostname: &str) -> Result<()>;
    async fn delete_static_lease(&self, mac: &str, ip: &str, hostname: &str) -> Result<()>;
}

// ---------------------------------------------------------------------------
// Background sync task
// ---------------------------------------------------------------------------

pub async fn run_sync_task(state: AppState) {
    tracing::info!("Starting integration sync task...");
    loop {
        if let Err(e) = sync_all_integrations(&state).await {
            tracing::error!("Integration sync cycle failed: {}", e);
        }
        sleep(Duration::from_secs(1800)).await;
    }
}

async fn sync_all_integrations(state: &AppState) -> Result<()> {
    let all = integrations::Entity::find().all(&state.db.conn).await?;

    for model in all {
        set_integration_status(state, &model, "SYNCING").await;

        match process_integration(state, &model).await {
            Ok(_) => {
                let mut active: integrations::ActiveModel = model.into();
                active.status = Set(Some("ACTIVE".to_string()));
                active.last_sync_at = Set(Some(Utc::now().into()));
                if let Err(e) = active.update(&state.db.conn).await {
                    tracing::error!("Failed to update integration status: {}", e);
                }
            }
            Err(e) => {
                tracing::error!("Failed to sync integration {}: {}", model.name, e);
                let err_msg: String = format!("ERROR: {}", friendly_integration_error_message(&e))
                    .chars()
                    .take(50)
                    .collect();
                set_integration_status(state, &model, &err_msg).await;
            }
        }
    }
    Ok(())
}

fn friendly_integration_error_message(error: &anyhow::Error) -> String {
    let lower = error.to_string().to_lowercase();

    if lower.contains("timed out") || lower.contains("timeout") {
        return "request timed out".to_string();
    }
    if lower.contains("unauthorized") || lower.contains("401") {
        return "authentication failed (check integration credentials)".to_string();
    }
    if lower.contains("forbidden") || lower.contains("403") {
        return "access denied by provider".to_string();
    }
    if lower.contains("connection refused") {
        return "cannot connect to provider endpoint".to_string();
    }
    if lower.contains("dns") || lower.contains("name or service not known") {
        return "provider host could not be resolved".to_string();
    }
    if lower.contains("certificate") || lower.contains("tls") {
        return "tls/certificate validation failed".to_string();
    }

    error.to_string()
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

pub fn create_provider(model: &integrations::Model) -> Result<Box<dyn IntegrationProvider>> {
    match model.provider_type.as_str() {
        "AdGuardHome" => Ok(Box::new(adguard::AdGuardIntegration::new(&model.config)?)),
        other => Err(anyhow::anyhow!("Unknown provider type: {}", other)),
    }
}

// ---------------------------------------------------------------------------
// Integration processing (broken into focused helpers)
// ---------------------------------------------------------------------------

pub async fn process_integration(state: &AppState, model: &integrations::Model) -> Result<()> {
    let provider = create_provider(model)?;

    let _ = provider.fetch_services().await?;
    sync_networks(state, &*provider, &model.name).await?;
    sync_devices(state, &*provider).await?;

    Ok(())
}

async fn sync_networks(
    state: &AppState,
    provider: &dyn IntegrationProvider,
    integration_name: &str,
) -> Result<()> {
    let fetched = provider.fetch_networks().await?;
    tracing::info!(
        "Integration {} returned {} networks",
        integration_name,
        fetched.len()
    );

    let mut known_networks = state.db.list_networks().await?;

    for net in fetched {
        let already_exists = known_networks
            .iter()
            .any(|n| n.cidr.to_string() == net.cidr);
        if already_exists {
            continue;
        }

        tracing::info!(
            "Auto-importing network {} ({}) from integration",
            net.name,
            net.cidr
        );

        use std::str::FromStr;
        let cidr = ipnetwork::IpNetwork::from_str(&net.cidr)
            .map_err(|e| anyhow::anyhow!("Invalid CIDR from integration: {}", e))?;
        let gateway = net.gateway.and_then(|g| g.parse::<std::net::IpAddr>().ok());

        state
            .db
            .create_network(crate::db::CreateNetworkParams {
                name: net.name,
                cidr,
                gateway,
                vlan_id: net.vlan_id,
                dns_servers: None,
                description: Some(format!(
                    "Auto-imported from {} integration",
                    integration_name
                )),
            })
            .await?;

        known_networks = state.db.list_networks().await?;
    }

    Ok(())
}

async fn sync_devices(state: &AppState, provider: &dyn IntegrationProvider) -> Result<()> {
    let leases = provider.fetch_devices().await?;
    let all_networks = state.db.list_networks().await?;

    for lease in leases {
        // Skip IPv6
        if let Ok(std::net::IpAddr::V6(_)) = lease.ip_address.parse::<std::net::IpAddr>() {
            continue;
        }

        let mac = lease.mac_address.to_lowercase();
        let device_id = ensure_device_for_mac(state, &mac, &lease.hostname).await?;

        let matched_network = all_networks.iter().find(|n| {
            lease
                .ip_address
                .parse::<std::net::IpAddr>()
                .map(|ip| n.cidr.contains(ip))
                .unwrap_or(false)
        });

        let Some(network) = matched_network else {
            tracing::warn!(
                "Skipping IP sync for {}: no matching network for IP {}",
                lease.hostname,
                lease.ip_address
            );
            continue;
        };

        sync_ip_for_device(state, &lease, &mac, device_id, network.id).await?;
    }

    Ok(())
}

async fn ensure_device_for_mac(state: &AppState, mac: &str, hostname: &str) -> Result<uuid::Uuid> {
    let existing = interfaces::Entity::find()
        .select_only()
        .column(interfaces::Column::Id)
        .column(interfaces::Column::DeviceId)
        .filter(
            Expr::col(interfaces::Column::MacAddress)
                .eq(Expr::val(mac).cast_as(Alias::new("macaddr"))),
        )
        .into_tuple::<(uuid::Uuid, uuid::Uuid)>()
        .one(&state.db.conn)
        .await?;

    if let Some((_iface_id, device_id)) = existing {
        if let Some(device) = devices::Entity::find_by_id(device_id)
            .one(&state.db.conn)
            .await?
        {
            if device.hostname != hostname {
                let mut active: devices::ActiveModel = device.into();
                active.hostname = Set(hostname.to_string());
                if let Err(e) = active.update(&state.db.conn).await {
                    tracing::warn!("Failed to update hostname for device {}: {}", device_id, e);
                }
            }
        }
        return Ok(device_id);
    }

    let new_device_id = uuid::Uuid::now_v7();
    let new_device = devices::ActiveModel {
        id: Set(new_device_id),
        hostname: Set(hostname.to_string()),
        r#type: Set("OTHER".to_string()),
        created_at: Set(Utc::now().into()),
        ..Default::default()
    };
    new_device.insert(&state.db.conn).await?;

    state
        .db
        .create_interface(
            new_device_id,
            crate::models::CreateInterfacePayload {
                name: "eth0".to_string(),
                mac_address: Some(mac.to_string()),
                interface_type: "ethernet".to_string(),
            },
        )
        .await?;

    Ok(new_device_id)
}

async fn sync_ip_for_device(
    state: &AppState,
    lease: &IntegrationDhcpLease,
    mac: &str,
    device_id: uuid::Uuid,
    network_id: uuid::Uuid,
) -> Result<()> {
    let ip_str = &lease.ip_address;

    let existing_ip = ip_addresses::Entity::find()
        .select_only()
        .column(ip_addresses::Column::Id)
        .column(ip_addresses::Column::InterfaceId)
        .column(ip_addresses::Column::IsStatic)
        .filter(
            Expr::col(ip_addresses::Column::IpAddress)
                .eq(Expr::val(ip_str).cast_as(Alias::new("inet"))),
        )
        .into_tuple::<(uuid::Uuid, Option<uuid::Uuid>, bool)>()
        .one(&state.db.conn)
        .await?;

    let should_create = match &existing_ip {
        None => true,
        Some((_, iface_id, _)) => iface_id.is_none(),
    };

    if should_create {
        let interface_id = interfaces::Entity::find()
            .select_only()
            .column(interfaces::Column::Id)
            .filter(
                Expr::col(interfaces::Column::MacAddress)
                    .eq(Expr::val(mac).cast_as(Alias::new("macaddr"))),
            )
            .into_tuple::<uuid::Uuid>()
            .one(&state.db.conn)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Interface not found after creation/check"))?;

        use std::str::FromStr;
        state
            .db
            .create_ip(crate::db::CreateIpParams {
                network_id,
                device_id: Some(device_id),
                interface_id: Some(interface_id),
                ip_address: ip_str
                    .parse()
                    .unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::UNSPECIFIED)),
                mac_address: mac_address::MacAddress::from_str(mac).ok(),
                is_static: lease.is_static,
                status: crate::models::IpStatus::Active,
                description: Some("Synced from Integration".to_string()),
            })
            .await?;
    } else if let Some((ip_id, _, db_is_static)) = existing_ip {
        // Upgrade dynamic → static if the integration says it's static
        if lease.is_static && !db_is_static {
            tracing::info!(
                "Upgrading existing IP {} to static based on integration sync.",
                ip_str
            );
            let stmt = Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                "UPDATE ip_addresses SET is_static = true WHERE id = $1",
                vec![ip_id.into()],
            );
            if let Err(e) = state.db.conn.execute(stmt).await {
                tracing::warn!("Failed to upgrade IP {} to static: {}", ip_str, e);
            }
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Static lease push / delete (unified)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy)]
enum LeaseAction {
    Push,
    Delete,
}

async fn trigger_static_lease_action(
    state: &AppState,
    action: LeaseAction,
    mac: &str,
    ip: &str,
    hostname: &str,
) {
    let active_integrations = match integrations::Entity::find()
        .filter(integrations::Column::Status.eq("ACTIVE"))
        .all(&state.db.conn)
        .await
    {
        Ok(list) => list,
        Err(e) => {
            tracing::error!("Failed to query active integrations: {}", e);
            return;
        }
    };

    for model in active_integrations {
        let provider = match create_provider(&model) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let result = match action {
            LeaseAction::Push => provider.push_static_lease(mac, ip, hostname).await,
            LeaseAction::Delete => provider.delete_static_lease(mac, ip, hostname).await,
        };

        if let Err(e) = result {
            tracing::error!(
                "Failed to {:?} static lease for integration {}: {}",
                action,
                model.name,
                e
            );
        }
    }
}

pub async fn trigger_static_lease_push(state: &AppState, mac: &str, ip: &str, hostname: &str) {
    trigger_static_lease_action(state, LeaseAction::Push, mac, ip, hostname).await;
}

pub async fn trigger_static_lease_delete(state: &AppState, mac: &str, ip: &str, hostname: &str) {
    trigger_static_lease_action(state, LeaseAction::Delete, mac, ip, hostname).await;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn set_integration_status(state: &AppState, model: &integrations::Model, status: &str) {
    let mut active: integrations::ActiveModel = model.clone().into();
    active.status = Set(Some(status.to_string()));
    if let Err(e) = active.update(&state.db.conn).await {
        tracing::warn!("Failed to set integration status to '{}': {}", status, e);
    }
}
