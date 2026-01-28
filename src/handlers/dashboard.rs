use crate::handlers::common::{internal_error, json_response, AppResult};
use crate::models::DashboardService;
use crate::AppState;
use crate::ServiceStatus;
use axum::{extract::State, response::IntoResponse};
use serde::Serialize;

#[derive(Serialize)]
pub struct DashboardServiceResponse {
    #[serde(flatten)]
    pub service: DashboardService,
    pub status: String,
}

#[derive(Serialize)]
pub struct DashboardData {
    pub services: Vec<DashboardServiceResponse>,
    // Add more stats here later (e.g. device count, alert count)
}

pub async fn show_dashboard(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let services = state
        .db
        .list_dashboard_services()
        .await
        .map_err(internal_error)?;

    let statuses = state.service_statuses.read().unwrap();

    let services_with_status = services
        .into_iter()
        .map(|s| {
            let status = statuses
                .get(&s.id)
                .cloned()
                .unwrap_or(ServiceStatus::Unknown);
            DashboardServiceResponse {
                service: s,
                status: format!("{:?}", status).to_uppercase(),
            }
        })
        .collect();

    json_response(DashboardData {
        services: services_with_status,
    })
}
