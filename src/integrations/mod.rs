use crate::AppState;
use crate::entities::{integrations, services};
use crate::models::{CreateServicePayload, CreateDevicePayload};
use sea_orm::{ActiveModelTrait, EntityTrait, Set, ColumnTrait, QueryFilter};
use tokio::time::{sleep, Duration};
use chrono::Utc;
use async_trait::async_trait;
use anyhow::Result;

pub mod adguard;

/// Represents the type of source integration
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IntegrationType {
    AdGuardHome,
    KeaDhcp,
    UnifiController,
    Custom(String),
}

#[async_trait]
pub trait IntegrationProvider: Send + Sync {
    fn provider_id(&self) -> &str;
    fn integration_type(&self) -> IntegrationType;
    async fn health_check(&self) -> Result<()>;
    async fn fetch_services(&self) -> Result<Vec<CreateServicePayload>>;
    async fn fetch_devices(&self) -> Result<Vec<CreateDevicePayload>>;
}

pub async fn run_sync_task(state: AppState) {
    tracing::info!("Starting integration sync task...");
    loop {
        if let Err(e) = sync_all_integrations(&state).await {
            tracing::error!("Integration sync cycle failed: {}", e);
        }
        sleep(Duration::from_secs(60)).await;
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

    // 1. Sync Services (DNS Rewrites)
    let fetched_services = provider.fetch_services().await?;
    for payload in fetched_services {
        // Upsert logic: Check if service exists by base_url or name
        // For simplicity, we just create if not exists for now, or match on name
        let existing = services::Entity::find()
            .filter(services::Column::Name.eq(&payload.name))
            .one(&state.conn)
            .await?;

        if existing.is_none() {
            let new_service = services::ActiveModel {
                id: Set(uuid::Uuid::now_v7()),
                name: Set(payload.name),
                base_url: Set(payload.base_url),
                is_public: Set(Some(payload.is_public)),
                monitor_interval_seconds: Set(Some(300)), // Default 5 mins
                ..Default::default()
            };
            new_service.insert(&state.conn).await?;
        }
    }
    
    // 2. Sync Devices (DHCP Leases)
    let _fetched_devices = provider.fetch_devices().await?;
    // Placeholder for device syncing - assuming we will implement later or mapping to devices entity
    // If we want to implement it we need to import devices entity
    
    Ok(())
}
