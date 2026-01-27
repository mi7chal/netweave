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

    // build app
    let app = create_app(pool).await;

    // create socket
    let addr = SocketAddr::from(([0, 0, 0, 0], 8789));
    tracing::info!("Server listening on {}", addr);

    // bind socket to Axium
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
