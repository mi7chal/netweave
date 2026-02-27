use crate::handlers::common::AppResult;
use crate::models::DashboardService;
use crate::{AppState, ServiceStatus};
use axum::{extract::State, Json};
use serde::Serialize;

#[derive(Serialize)]
pub struct DashboardServiceResponse {
    #[serde(flatten)]
    pub service: DashboardService,
    pub status: String,
    pub uptime_percentage: f64,
}

#[derive(Serialize)]
pub struct DashboardData {
    pub services: Vec<DashboardServiceResponse>,
}

pub async fn show_dashboard(State(state): State<AppState>) -> AppResult<Json<DashboardData>> {
    let services = state.db.list_dashboard_services().await?;
    let statuses = state.service_statuses.read().unwrap();

    let services = services
        .into_iter()
        .map(|s| {
            let status = statuses.get(&s.id).cloned().unwrap_or(ServiceStatus::Unknown);
            let uptime_percentage = if s.total_checks > 0 {
                (s.successful_checks as f64 / s.total_checks as f64) * 100.0
            } else {
                100.0
            };
            DashboardServiceResponse {
                service: s,
                status: format!("{:?}", status).to_uppercase(),
                uptime_percentage,
            }
        })
        .collect();

    Ok(Json(DashboardData { services }))
}
