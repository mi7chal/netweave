pub mod auth;
pub mod db;
pub mod entities;
pub mod handlers;
pub mod integrations;
pub mod models;
pub mod monitoring;
pub mod routes;
pub mod utils;

use crate::auth::oidc::OidcService;
use crate::db::Db;
use axum::Router;
use sea_orm::{DatabaseConnection, SqlxPostgresConnector};
use sqlx::postgres::PgPool;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub enum ServiceStatus {
    Up,
    Down,
    Unknown,
}

use crate::integrations::IntegrationProvider;

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub conn: DatabaseConnection, // SeaORM connection
    pub oidc: Option<OidcService>,
    pub service_statuses: Arc<RwLock<HashMap<Uuid, ServiceStatus>>>,
    pub integrations: Arc<RwLock<Vec<Arc<dyn IntegrationProvider>>>>,
}

pub async fn create_state(pool: PgPool, oidc: Option<OidcService>) -> AppState {
    let db = Db::new(pool.clone());
    let conn = SqlxPostgresConnector::from_sqlx_postgres_pool(pool.clone());
    let service_statuses = Arc::new(RwLock::new(HashMap::new()));
    let integrations = Arc::new(RwLock::new(Vec::new()));

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Ensure default users
    auth::ensure_default_users(&db).await;

    AppState {
        db,
        conn,
        oidc,
        service_statuses,
        integrations,
    }
}

/// Creates the application router.
pub fn create_app(state: AppState) -> Router {
    routes::create_router(state)
}
