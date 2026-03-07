use crate::handlers::common::{enrich_services_with_status, AppResult, ServiceWithStatus};
use crate::AppState;
use axum::{extract::State, Json};
use serde::Serialize;

#[derive(Serialize)]
pub struct DashboardData {
    pub services: Vec<ServiceWithStatus>,
}

pub async fn show_dashboard(State(state): State<AppState>) -> AppResult<Json<DashboardData>> {
    let services = state.db.list_dashboard_services().await?;
    let services = enrich_services_with_status(&state, services).await;
    Ok(Json(DashboardData { services }))
}
