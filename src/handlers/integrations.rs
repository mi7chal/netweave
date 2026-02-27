use crate::handlers::common::{AppError, AppResult};
use crate::AppState;
use axum::{extract::{Path, State}, http::StatusCode, response::IntoResponse, Json};
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use uuid::Uuid;
use crate::entities::integrations;
use serde::{Deserialize, Serialize};
use crate::utils::encryption;

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateIntegrationPayload {
    pub name: String,
    pub provider_type: String,
    pub config: serde_json::Value,
}

pub async fn list_integrations(State(state): State<AppState>) -> AppResult<Json<Vec<integrations::Model>>> {
    let mut list = integrations::Entity::find().all(&state.conn).await?;

    // Strip sensitive fields
    for i in &mut list {
        if let serde_json::Value::Object(ref mut map) = i.config {
            map.remove("password");
            map.remove("token");
        }
    }

    Ok(Json(list))
}

pub async fn create_integration(
    State(state): State<AppState>,
    Json(mut payload): Json<CreateIntegrationPayload>,
) -> AppResult<Json<integrations::Model>> {
    // Encrypt sensitive fields
    if let serde_json::Value::Object(ref mut map) = payload.config {
        for field in ["password", "token"] {
            if let Some(val) = map.get(field).and_then(|v| v.as_str()).filter(|v| !v.is_empty()) {
                let encrypted = encryption::encrypt(val)
                    .map_err(|e| AppError::Internal(anyhow::anyhow!("Encryption error: {e}")))?;
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

    let saved = model.insert(&state.conn).await?;
    let integration = saved.clone();
    let s = state.clone();

    tokio::spawn(async move {
        update_integration_status(&s, &integration, "SYNCING").await;
        match crate::integrations::process_integration(&s, &integration).await {
            Ok(_) => {
                let mut active: integrations::ActiveModel = integration.into();
                active.status = Set(Some("ACTIVE".to_string()));
                active.last_sync_at = Set(Some(chrono::Utc::now().into()));
                let _ = active.update(&s.conn).await;
            }
            Err(e) => {
                tracing::error!("Auto sync failed: {e}");
                update_integration_status(&s, &integration, &format!("ERROR: {}", e.to_string().chars().take(240).collect::<String>())).await;
            }
        }
    });

    Ok(Json(saved))
}

pub async fn delete_integration(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    integrations::Entity::delete_by_id(id).exec(&state.conn).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn trigger_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let integration = match integrations::Entity::find_by_id(id).one(&state.conn).await {
        Ok(Some(i)) => i,
        Ok(None) => return (StatusCode::NOT_FOUND, "Integration not found").into_response(),
        Err(e) => return AppError::Internal(e.into()).into_response(),
    };

    update_integration_status(&state, &integration, "SYNCING").await;

    tokio::spawn(async move {
        match crate::integrations::process_integration(&state, &integration).await {
            Ok(_) => {
                let mut active: integrations::ActiveModel = integration.into();
                active.status = Set(Some("ACTIVE".to_string()));
                active.last_sync_at = Set(Some(chrono::Utc::now().into()));
                active.update(&state.conn).await.ok();
            }
            Err(e) => {
                tracing::error!("Manual sync failed: {e}");
                update_integration_status(&state, &integration, &format!("ERROR: {}", e.to_string().chars().take(240).collect::<String>())).await;
            }
        }
    });

    (StatusCode::ACCEPTED, "Sync started").into_response()
}

async fn update_integration_status(state: &AppState, integration: &integrations::Model, status: &str) {
    let mut active: integrations::ActiveModel = integration.clone().into();
    active.status = Set(Some(status.to_string()));
    let _ = active.update(&state.conn).await;
}
