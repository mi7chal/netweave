use crate::handlers::common::{AppError, AppResult, ServiceWithStatus, enrich_services_with_status};
use crate::models::CreateServicePayload;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

pub async fn list_services(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<ServiceWithStatus>>> {
    let services = state.db.list_dashboard_services().await?;
    let response = enrich_services_with_status(&state, services).await;
    Ok(Json(response))
}

pub async fn create_service(
    State(state): State<AppState>,
    Json(payload): Json<CreateServicePayload>,
) -> AppResult<Json<Uuid>> {
    let service_id = crate::services::ServiceService::create(&state.db, payload).await?;
    Ok(Json(service_id))
}

pub async fn get_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<crate::models::Service>> {
    let service = state
        .db
        .get_service(id)
        .await?
        .ok_or(AppError::NotFound("Service not found".into()))?;
    Ok(Json(service))
}

pub async fn update_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateServicePayload>,
) -> AppResult<Json<bool>> {
    let result = crate::services::ServiceService::update(&state.db, id, payload).await?;
    Ok(Json(result))
}

pub async fn delete_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    state.db.delete_service(id).await?;
    Ok(StatusCode::NO_CONTENT)
}
