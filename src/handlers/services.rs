use crate::handlers::common::{AppError, AppResult, ServiceWithStatus, enrich_services_with_status};
use crate::models::CreateServicePayload;
use crate::utils::validation;
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
    validation::validate_name(&payload.name, "Service name", 100)
        .map_err(AppError::BadRequest)?;
    validation::validate_url(&payload.base_url).map_err(AppError::BadRequest)?;
    Ok(Json(state.db.create_service(payload).await?))
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
    validation::validate_name(&payload.name, "Service name", 100)
        .map_err(AppError::BadRequest)?;
    validation::validate_url(&payload.base_url).map_err(AppError::BadRequest)?;
    Ok(Json(state.db.update_service(id, payload).await?))
}

pub async fn delete_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    state.db.delete_service(id).await?;
    Ok(StatusCode::NO_CONTENT)
}
