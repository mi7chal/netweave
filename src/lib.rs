pub mod auth;
pub mod db;
pub mod entities;
pub mod handlers;
pub mod integrations;
pub mod models;
pub mod monitoring;
pub mod routes;
pub mod services;
pub mod utils;

use crate::auth::oidc::OidcService;
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

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub oidc: Option<OidcService>,
    pub service_statuses: Arc<RwLock<HashMap<Uuid, ServiceStatus>>>,
    pub login_rate_limiter: LoginRateLimiter,
}

pub async fn create_state(pool: PgPool, oidc: Option<OidcService>) -> anyhow::Result<AppState> {
    let db = Db::new(pool);
    let service_statuses = Arc::new(RwLock::new(HashMap::new()));
    let login_rate_limiter = LoginRateLimiter::new(10, Duration::from_secs(60));

    sqlx::migrate!("./migrations")
        .run(&db.pool)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to run migrations: {}", e))?;

    auth::ensure_default_users(&db).await;

    Ok(AppState {
        db,
        oidc,
        service_statuses,
        login_rate_limiter,
    })
}

pub async fn create_app(state: AppState) -> anyhow::Result<Router> {
    routes::create_router(state).await
}
