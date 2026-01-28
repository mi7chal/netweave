use crate::handlers::common::{internal_error, json_response, AppResult};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use uuid::Uuid;
use crate::entities::integrations;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateIntegrationPayload {
    pub name: String,
    pub provider_type: String,
    pub config: serde_json::Value,
}

use crate::utils::encryption;

/// List all integrations (Masked)
pub async fn list_integrations(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let integrations = integrations::Entity::find()
        .all(&state.conn)
        .await
        .map_err(internal_error)?;
    
    // Remove sensitive data
    let safe_list: Vec<integrations::Model> = integrations.into_iter().map(|mut i| {
        if let serde_json::Value::Object(ref mut map) = i.config {
            map.remove("password");
            map.remove("token");
        }
        i
    }).collect();

    json_response(safe_list)
}

/// Create a new integration (Encrypted)
pub async fn create_integration(
    State(state): State<AppState>,
    Json(mut payload): Json<CreateIntegrationPayload>,
) -> AppResult<impl IntoResponse> {
    
    // Encrypt sensitive fields
    if let serde_json::Value::Object(ref mut map) = payload.config {
        for field in ["password", "token"] {
            if let Some(val) = map.get(field).and_then(|v| v.as_str()) {
                if !val.is_empty() {
                    let encrypted = encryption::encrypt(val)
                        .map_err(|e| internal_error(anyhow::anyhow!("Encryption error: {}", e)))?;
                    map.insert(field.to_string(), serde_json::json!(encrypted));
                }
            }
        }
    }

    let new_integration = integrations::ActiveModel {
        id: Set(Uuid::now_v7()),
        name: Set(payload.name),
        provider_type: Set(payload.provider_type),
        config: Set(payload.config),
        status: Set(Some("PENDING".to_string())),
        created_at: Set(chrono::Utc::now().into()),
        updated_at: Set(chrono::Utc::now().into()),
        ..Default::default()
    };

    let saved = new_integration.insert(&state.conn).await.map_err(internal_error)?;
    json_response(saved)
}

/// Delete integration
pub async fn delete_integration(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    integrations::Entity::delete_by_id(id)
        .exec(&state.conn)
        .await
        .map_err(internal_error)?;
    Ok(StatusCode::NO_CONTENT)
}

/// Manually trigger a sync for an integration
pub async fn trigger_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let integration = match integrations::Entity::find_by_id(id).one(&state.conn).await {
        Ok(Some(i)) => i,
        Ok(None) => return (StatusCode::NOT_FOUND, "Integration not found").into_response(),
        Err(e) => return internal_error(e).into_response(),
    };

    // Update status to SYNCING
    let mut active: integrations::ActiveModel = integration.clone().into();
    active.status = Set(Some("SYNCING".to_string()));
    active.update(&state.conn).await.ok();

    tokio::spawn(async move {
        match crate::integrations::process_integration(&state, &integration).await {
            Ok(_) => {
                let mut active: integrations::ActiveModel = integration.into();
                active.status = Set(Some("ACTIVE".to_string()));
                active.last_sync_at = Set(Some(chrono::Utc::now().into()));
                active.update(&state.conn).await.ok();
            }
            Err(e) => {
                tracing::error!("Manual sync failed: {}", e);
                let mut active: integrations::ActiveModel = integration.into();
                let err_msg = format!("ERROR: {}", e);
                active.status = Set(Some(err_msg.chars().take(250).collect()));
                active.update(&state.conn).await.ok();
            }
        }
    });

    (StatusCode::ACCEPTED, "Sync started").into_response()
}
