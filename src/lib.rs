pub mod auth;
pub mod db;
pub mod handlers;
pub mod models;
pub mod routes;
pub mod ui;

use crate::db::Db;
use axum::Router;
use sqlx::postgres::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
}

/// Creates the application router with the given database pool. Config and etc. should be set up before calling this.
pub async fn create_app(pool: PgPool) -> Router {
    let db = Db::new(pool);

    auth::ensure_default_users(&db).await;

    let state = AppState { db };

    routes::create_router(state)
}
