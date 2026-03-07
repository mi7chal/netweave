use crate::db::Db;
use crate::entities::integrations;
use crate::handlers::integrations::CreateIntegrationPayload;
use crate::utils::encryption;
use crate::validation;
use crate::AppState;
use anyhow::Result;
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use uuid::Uuid;

pub struct IntegrationService;

impl IntegrationService {
	pub async fn list_sanitized(db: &Db) -> Result<Vec<integrations::Model>> {
		let mut list = integrations::Entity::find().all(&db.conn).await?;

		for integration in &mut list {
			if let serde_json::Value::Object(ref mut map) = integration.config {
				map.remove("password");
				map.remove("token");
			}
		}

		Ok(list)
	}

	pub async fn create(db: &Db, mut payload: CreateIntegrationPayload) -> Result<integrations::Model> {
		validation::validate_name(&payload.name, "Integration name", 100)?;

		if let serde_json::Value::Object(ref mut map) = payload.config {
			for field in ["password", "token"] {
				if let Some(val) = map
					.get(field)
					.and_then(|v| v.as_str())
					.filter(|v| !v.is_empty())
				{
					let encrypted = encryption::encrypt(val)
						.map_err(|e| anyhow::anyhow!("Encryption error: {e}"))?;
					map.insert(field.to_string(), serde_json::json!(encrypted));
				}
			}
		}

		let now = chrono::Utc::now().into();
		let model = integrations::ActiveModel {
			id: Set(Uuid::now_v7()),
			name: Set(payload.name),
			provider_type: Set(payload.provider_type),
			config: Set(payload.config),
			status: Set(Some("PENDING".to_string())),
			created_at: Set(now),
			updated_at: Set(now),
			..Default::default()
		};

		Ok(model.insert(&db.conn).await?)
	}

	pub async fn delete(db: &Db, id: Uuid) -> Result<()> {
		integrations::Entity::delete_by_id(id).exec(&db.conn).await?;
		Ok(())
	}

	pub async fn trigger_sync(state: AppState, id: Uuid) -> Result<bool> {
		let integration = match integrations::Entity::find_by_id(id)
			.one(&state.db.conn)
			.await?
		{
			Some(i) => i,
			None => return Ok(false),
		};

		Self::update_status(&state, &integration, "SYNCING").await;
		Self::spawn_sync(state, integration);
		Ok(true)
	}

	pub fn spawn_sync(state: AppState, integration: integrations::Model) {
		tokio::spawn(async move {
			match crate::integrations::process_integration(&state, &integration).await {
				Ok(_) => {
					let mut active: integrations::ActiveModel = integration.into();
					active.status = Set(Some("ACTIVE".to_string()));
					active.last_sync_at = Set(Some(chrono::Utc::now().into()));
					if let Err(e) = active.update(&state.db.conn).await {
						tracing::error!("Failed to update integration status to ACTIVE: {}", e);
					}
				}
				Err(e) => {
					tracing::error!("Integration sync failed: {e}");
					let msg: String = e.to_string().chars().take(240).collect();
					Self::update_status(&state, &integration, &format!("ERROR: {msg}")).await;
				}
			}
		});
	}

	async fn update_status(state: &AppState, integration: &integrations::Model, status: &str) {
		let mut active: integrations::ActiveModel = integration.clone().into();
		active.status = Set(Some(status.to_string()));
		if let Err(e) = active.update(&state.db.conn).await {
			tracing::warn!("Failed to update integration status to '{}': {}", status, e);
		}
	}
}
