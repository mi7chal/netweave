mod api;
mod cors;
mod middleware;

use crate::auth;
use crate::AppState;
use axum::Router;
use tower_http::services::{ServeDir, ServeFile};
use tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions_sqlx_store::PostgresStore;

use api::{auth_protected_api_routes, dashboard_routes, public_api_routes};
use cors::build_cors_layer;

/// Creates main app router.
pub async fn create_router(state: AppState) -> anyhow::Result<Router> {
    let session_store = PostgresStore::new(state.db.pool.clone());
    session_store
        .migrate()
        .await
        .map_err(|error| anyhow::anyhow!("Failed to migrate session store: {}", error))?;

    let key = tower_sessions::cookie::Key::from(state.config.session_secret.as_bytes());

    let session_layer = SessionManagerLayer::new(session_store)
        .with_signed(key)
        .with_secure(state.config.session_secure_cookie)
        .with_http_only(true)
        .with_same_site(tower_sessions::cookie::SameSite::Lax)
        .with_expiry(Expiry::OnInactivity(
            tower_sessions::cookie::time::Duration::hours(1),
        ));

    let auth_routes = auth::routes(state.clone());
    let spa_service =
        ServeDir::new("web/dist").not_found_service(ServeFile::new("web/dist/index.html"));

    Ok(Router::new()
        .nest("/api", dashboard_routes(state.clone()))
        .nest("/api", auth_protected_api_routes(state.clone()))
        .nest("/api", public_api_routes())
        .nest("/api/auth", auth_routes)
        .fallback_service(spa_service)
        .layer(build_cors_layer(&state.config.allowed_origins))
        .layer(session_layer)
        .with_state(state))
}
