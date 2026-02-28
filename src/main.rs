use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use netweave::create_app;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    netweave::utils::encryption::validate_encryption_key();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        eprintln!("ERROR: DATABASE_URL must be set");
        std::process::exit(1);
    });
    tracing::debug!("Connecting to database...");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .unwrap_or_else(|e| {
            eprintln!("ERROR: Failed to connect to Postgres: {}", e);
            std::process::exit(1);
        });

    tracing::debug!("Initializing OIDC Service...");
    let oidc = match netweave::auth::oidc::OidcService::from_env().await {
        Ok(service) => {
            tracing::info!("OIDC Service initialized.");
            Some(service)
        }
        Err(e) => {
            tracing::warn!("OIDC init failed (running without OIDC): {}", e);
            None
        }
    };

    let state = netweave::create_state(pool, oidc).await.unwrap_or_else(|e| {
        eprintln!("ERROR: {}", e);
        std::process::exit(1);
    });

    tokio::spawn(netweave::monitoring::start_monitoring(state.clone()));
    tokio::spawn(netweave::integrations::run_sync_task(state.clone()));

    let app = create_app(state).await.unwrap_or_else(|e| {
        eprintln!("ERROR: {}", e);
        std::process::exit(1);
    });

    let port_str = std::env::var("PORT").unwrap_or_else(|_| "8789".to_string());
    let port: u16 = port_str.parse().unwrap_or(8789);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap_or_else(|e| {
        eprintln!("ERROR: Failed to bind to {}: {}", addr, e);
        std::process::exit(1);
    });
    if let Err(e) = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    {
        eprintln!("ERROR: Server error: {}", e);
        std::process::exit(1);
    }

    tracing::info!("Server shut down gracefully.");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.unwrap_or_else(|e| {
            eprintln!("ERROR: Failed to install Ctrl+C handler: {}", e);
            std::process::exit(1);
        });
    };

    #[cfg(unix)]
    let terminate = async {
        let mut sig = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .unwrap_or_else(|e| {
                eprintln!("ERROR: Failed to install SIGTERM handler: {}", e);
                std::process::exit(1);
            });
        sig.recv().await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("Received Ctrl+C, shutting down..."),
        _ = terminate => tracing::info!("Received SIGTERM, shutting down..."),
    }
}
