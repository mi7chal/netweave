use crate::handlers::common::{AppError, AppResult};
use crate::services::integration_service::IntegrationService;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateIntegrationPayload {
    pub name: String,
    pub provider_type: String,
    pub config: serde_json::Value,
}

pub async fn list_integrations(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<crate::entities::integrations::Model>>> {
    let list = IntegrationService::list_sanitized(&state.db).await?;
    Ok(Json(list))
}

pub async fn create_integration(
    State(state): State<AppState>,
    Json(payload): Json<CreateIntegrationPayload>,
) -> AppResult<Json<crate::entities::integrations::Model>> {
    let saved = IntegrationService::create(&state.db, payload)
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    IntegrationService::spawn_sync(state, saved.clone());
    Ok(Json(saved))
}

pub async fn delete_integration(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    IntegrationService::delete(&state.db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn trigger_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match IntegrationService::trigger_sync(state, id).await {
        Ok(true) => (StatusCode::ACCEPTED, "Sync started").into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, "Integration not found").into_response(),
        Err(e) => AppError::Internal(e).into_response(),
    }
}
