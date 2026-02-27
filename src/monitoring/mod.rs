use crate::AppState;
use crate::ServiceStatus;
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
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
    let services = state.db.list_dashboard_services().await?;

    for service in services {
        let url = service.base_url;

        let (status, is_success) = match client.get(&url).send().await {
            Ok(res) => {
                if res.status().is_success() {
                    (ServiceStatus::Up, true)
                } else {
                    (ServiceStatus::Down, false)
                }
            }
            Err(_) => (ServiceStatus::Down, false),
        };

        // Update status in shared state
        if let Ok(mut statuses) = state.service_statuses.write() {
            statuses.insert(service.id, status);
        }

        // Increment checks in DB using parameterized query
        let success_inc: i32 = if is_success { 1 } else { 0 };
        let _ = state.db.conn.execute(Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            "UPDATE services SET total_checks = COALESCE(total_checks, 0) + 1, successful_checks = COALESCE(successful_checks, 0) + $1 WHERE id = $2",
            [success_inc.into(), service.id.to_string().into()],
        )).await;
    }
    Ok(())
}
