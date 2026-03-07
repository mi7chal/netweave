use netweave::config::Config;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    // Load config first
    let config = Config::from_env().unwrap_or_else(|e| {
        eprintln!("ERROR: Failed to load configuration: {}", e);
        std::process::exit(1);
    });

    // Setup tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(&config.rust_log))
        .with(tracing_subscriber::fmt::layer())
        .init();

    netweave::utils::encryption::validate_encryption_key();

    tracing::debug!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .unwrap_or_else(|e| {
            eprintln!("ERROR: Failed to connect to Postgres: {}", e);
            std::process::exit(1);
        });

    tracing::debug!("Initializing OIDC Service...");
    let oidc = if let Some(oidc_config) = config.oidc_config.as_ref() {
        match netweave::auth::oidc::OidcService::from_config(oidc_config).await {
            Ok(service) => {
                tracing::info!("OIDC Service initialized.");
                Some(service)
            }
            Err(e) => {
                tracing::warn!("OIDC init failed (running without OIDC): {}", e);
                None
            }
        }
    } else {
        None
    };

    let state = netweave::create_state(config.clone(), pool, oidc)
        .await
        .unwrap_or_else(|e| {
        eprintln!("ERROR: {}", e);
        std::process::exit(1);
    });

    tokio::spawn(netweave::monitoring::start_monitoring(state.clone()));
    tokio::spawn(netweave::integrations::run_sync_task(state.clone()));

    let app = netweave::create_app(state).await.unwrap_or_else(|e| {
        eprintln!("ERROR: {}", e);
        std::process::exit(1);
    });

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
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
