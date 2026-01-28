use crate::AppState;
use crate::ServiceStatus;
use std::time::Duration;
use tokio::time::sleep;

pub async fn start_monitoring(state: AppState) {
    tracing::info!("Starting service monitoring background task...");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .expect("Failed to build reqwest client");

    loop {
        tracing::debug!("Running service health checks...");
        if let Err(e) = check_all_services(&state, &client).await {
            tracing::error!("Error in monitoring loop: {}", e);
        }
        sleep(Duration::from_secs(60)).await;
    }
}

async fn check_all_services(state: &AppState, client: &reqwest::Client) -> anyhow::Result<()> {
    // We need to fetch services. We can use the existing db method list_dashboard_services or get_all.
    // Ideally we want all services details including health_endpoint.
    // list_dashboard_services doesn't select health_endpoint.
    // We should add a method to DB to list all for monitoring, or just list_dashboard_services and use base_url if health_endpoint is missing.
    // For now, let's use list_dashboard_services and assume base_url is the target.

    let services = state.db.list_dashboard_services().await?;

    for service in services {
        let url = service.base_url; // + health_endpoint if available?
                                    // simple check: GET url

        let status = match client.get(&url).send().await {
            Ok(res) => {
                if res.status().is_success() {
                    ServiceStatus::Up
                } else {
                    ServiceStatus::Down
                }
            }
            Err(_) => ServiceStatus::Down,
        };

        // Update status in shared state
        if let Ok(mut statuses) = state.service_statuses.write() {
            statuses.insert(service.id, status);
        }
    }
    Ok(())
}
