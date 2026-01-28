use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use homelab_manager::create_app;

/// Entry point
#[tokio::main]
async fn main() {
    // config and startup
    tracing::trace!("Loading configuration {}...", "environment variables");
    dotenvy::dotenv().ok();

    // loading subscriber with logging level from env
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    tracing::debug!("Connecting to database...");
    tracing::trace!("Databas url loaded: {}", db_url);

    // db pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    // OIDC Service
    // OIDC Service
    tracing::debug!("Initializing OIDC Service...");
    let oidc = match homelab_manager::auth::oidc::OidcService::from_env().await {
        Ok(service) => {
            tracing::info!("OIDC Service initialized.");
            Some(service)
        },
        Err(e) => {
            tracing::warn!("OIDC init failed (running without OIDC): {}", e);
            None
        }
    };

    // Create state
    let state = homelab_manager::create_state(pool, oidc).await;

    // Start monitoring background task
    tokio::spawn(homelab_manager::monitoring::start_monitoring(state.clone()));
    
    // Start integration sync background task
    tokio::spawn(homelab_manager::integrations::run_sync_task(state.clone()));

    // build app
    let app = create_app(state);

    // create socket
    let addr = SocketAddr::from(([0, 0, 0, 0], 8789));
    tracing::info!("Server listening on {}", addr);

    // bind socket to Axium
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
