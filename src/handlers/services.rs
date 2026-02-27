use crate::handlers::common::{AppError, AppResult};
use crate::models::{CreateServicePayload, DashboardService};
use crate::{AppState, ServiceStatus};
use axum::{extract::{Path, State}, http::StatusCode, Json};
use uuid::Uuid;

#[derive(serde::Serialize)]
pub struct ServiceResponse {
    #[serde(flatten)]
    pub service: DashboardService,
    pub status: String,
    pub uptime_percentage: f64,
}

pub async fn list_services(State(state): State<AppState>) -> AppResult<Json<Vec<ServiceResponse>>> {
    let services = state.db.list_dashboard_services().await?;
    let statuses = state.service_statuses.read().unwrap();

    let response = services
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

    Ok(Json(response))
}

pub async fn create_service(
    State(state): State<AppState>,
    Json(payload): Json<CreateServicePayload>,
) -> AppResult<Json<Uuid>> {
    Ok(Json(state.db.create_service(payload).await?))
}

pub async fn get_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<crate::models::Service>> {
    let service = state.db.get_service(id).await?
        .ok_or(AppError::NotFound("Service not found".into()))?;
    Ok(Json(service))
}

pub async fn update_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateServicePayload>,
) -> AppResult<Json<bool>> {
    Ok(Json(state.db.update_service(id, payload).await?))
}

pub async fn delete_service(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    state.db.delete_service(id).await?;
    Ok(StatusCode::NO_CONTENT)
}
