use crate::handlers::common::{internal_error, json_response, AppResult};
use crate::models::{CreateServicePayload, DashboardService};
use crate::{AppState, ServiceStatus};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

#[derive(serde::Serialize)]
pub struct ServiceResponse {
    #[serde(flatten)]
    pub service: DashboardService,
    pub status: String,
    pub uptime_percentage: f64,
}

/// List all services (Dashboard view)
pub async fn list_services(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let services = state
        .db
        .list_dashboard_services()
        .await
        .map_err(internal_error)?;

    let statuses = state.service_statuses.read().unwrap();

    let response: Vec<ServiceResponse> = services
        .into_iter()
        .map(|s| {
            let status = statuses.get(&s.id).cloned().unwrap_or(ServiceStatus::Unknown);
            let uptime_percentage = if s.total_checks > 0 {
                (s.successful_checks as f64 / s.total_checks as f64) * 100.0
            } else {
                100.0
            };

            ServiceResponse {
                service: s,
                status: format!("{:?}", status).to_uppercase(),
                uptime_percentage,
            }
        })
        .collect();

    json_response(response)
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
        .ok_or(crate::handlers::common::AppError::NotFound("Service not found".into()))?;

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
