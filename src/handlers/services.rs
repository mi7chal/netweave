use crate::handlers::common::{internal_error, json_response, AppResult, ErrorResponse};
use crate::models::CreateServicePayload;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

/// List all services (Dashboard view)
pub async fn list_services(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let services = state
        .db
        .list_dashboard_services()
        .await
        .map_err(internal_error)?;
    json_response(services)
}

/// Create a new service
pub async fn create_service(
    State(state): State<AppState>,
    Json(payload): Json<CreateServicePayload>,
) -> AppResult<impl IntoResponse> {
    let service = state
        .db
        .create_service(payload)
        .await
        .map_err(internal_error)?;
    json_response(service)
}

/// Get service details
pub async fn get_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let service = state
        .db
        .get_service(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Service not found".into(),
            }),
        ))?;

    json_response(service)
}

/// Update service
pub async fn update_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateServicePayload>,
) -> AppResult<impl IntoResponse> {
    let service = state
        .db
        .update_service(id, payload)
        .await
        .map_err(internal_error)?;
    json_response(service)
}

/// Delete service
pub async fn delete_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_service(id).await.map_err(internal_error)?;
    Ok(StatusCode::NO_CONTENT)
}
