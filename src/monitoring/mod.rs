use crate::AppState;
use crate::ServiceStatus;
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use std::time::Duration;
use tokio::time::sleep;

const REQUEST_TIMEOUT_SECS: u64 = 10;
const RETRY_ATTEMPTS: usize = 3;
const RETRY_DELAY_SECS: u64 = 5;

pub async fn start_monitoring(state: AppState) {
    tracing::info!("Starting service monitoring background task...");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .expect("Failed to build monitoring HTTP client");

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
        let (status, is_success) = check_service_status_with_retry(client, &url).await;

        state
            .service_statuses
            .write()
            .await
            .insert(service.id, status);

        let success_inc: i32 = if is_success { 1 } else { 0 };
        if let Err(e) = state
            .db
            .conn
            .execute(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                "UPDATE services SET total_checks = COALESCE(total_checks, 0) + 1, \
                 successful_checks = COALESCE(successful_checks, 0) + $1 WHERE id = $2::uuid",
                [success_inc.into(), service.id.to_string().into()],
            ))
            .await
        {
            tracing::warn!("Failed to update service check counters: {}", e);
        }
    }
    Ok(())
}

async fn check_service_status_with_retry(
    client: &reqwest::Client,
    url: &str,
) -> (ServiceStatus, bool) {
    for attempt in 1..=RETRY_ATTEMPTS {
        match client.get(url).send().await {
            Ok(response) if response.status().is_success() => return (ServiceStatus::Up, true),
            Ok(response) => {
                if response.status().is_server_error() && attempt < RETRY_ATTEMPTS {
                    sleep(Duration::from_secs(RETRY_DELAY_SECS)).await;
                    continue;
                }
                return (ServiceStatus::Down, false);
            }
            Err(error) => {
                if attempt < RETRY_ATTEMPTS {
                    tracing::debug!(
                        "Health check attempt {}/{} failed for {}: {}",
                        attempt,
                        RETRY_ATTEMPTS,
                        url,
                        error
                    );
                    sleep(Duration::from_secs(RETRY_DELAY_SECS)).await;
                    continue;
                }

                tracing::warn!(
                    "Health check failed after {} attempts for {}: {}",
                    RETRY_ATTEMPTS,
                    url,
                    error
                );
                return (ServiceStatus::Down, false);
            }
        }
    }

    (ServiceStatus::Down, false)
}
