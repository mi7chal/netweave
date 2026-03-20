pub mod auth;
pub mod config;
pub mod db;
pub mod entities;
pub mod handlers;
pub mod integrations;
pub mod models;
pub mod monitoring;
pub mod routes;
pub mod services;
pub mod utils;
pub mod validation;

use crate::auth::oidc::OidcService;
use crate::config::Config;
use crate::db::Db;
use crate::utils::rate_limit::LoginRateLimiter;
use axum::Router;
use sqlx::postgres::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub enum ServiceStatus {
    Up,
    Down,
    Unknown,
}

/// Geeneral app state object. It should contain all app data used during runtime (mutable and not).
#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub config: Config,
    pub oidc: Arc<RwLock<Option<OidcService>>>,
    pub service_statuses: Arc<RwLock<HashMap<Uuid, ServiceStatus>>>,
    pub login_rate_limiter: LoginRateLimiter,
}

/// State builder
pub async fn create_state(
    config: Config,
    pool: PgPool,
    oidc: Option<OidcService>,
) -> anyhow::Result<AppState> {
    let db = Db::new(pool);
    let service_statuses = Arc::new(RwLock::new(HashMap::new()));
    let login_rate_limiter = LoginRateLimiter::new(10, Duration::from_secs(60));

    // Runs migrations, it should allow to seamless version updates or database creation.
    sqlx::migrate!("./migrations")
        .run(&db.pool)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to run migrations: {}", e))?;

    auth::ensure_default_users(&db).await;

    Ok(AppState {
        db,
        config,
        oidc: Arc::new(RwLock::new(oidc)),
        service_statuses,
        login_rate_limiter,
    })
}
// Builds app router
pub async fn create_app(state: AppState) -> anyhow::Result<Router> {
    routes::create_router(state).await
}
