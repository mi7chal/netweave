use crate::auth::{self, AuthUser, AUTH_SESSION_KEY};
use crate::handlers;
use crate::AppState;
use axum::{
    extract::Request,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Router,
};
use tower_http::services::{ServeDir, ServeFile};
use tower_sessions::{Expiry, MemoryStore, Session, SessionManagerLayer};

async fn auth_middleware(session: Session, mut request: Request, next: Next) -> Response {
    let user: Option<AuthUser> = session.get(AUTH_SESSION_KEY).await.unwrap_or(None);

    if let Some(user) = user {
        request.extensions_mut().insert(user);
        next.run(request).await
    } else {
        (axum::http::StatusCode::UNAUTHORIZED, "Unauthorized").into_response()
    }
}

async fn require_admin(request: Request, next: Next) -> Response {
    let is_admin = request
        .extensions()
        .get::<AuthUser>()
        .map(|u| u.role == "ADMIN")
        .unwrap_or(false);

    if is_admin {
        next.run(request).await
    } else {
        (
            axum::http::StatusCode::FORBIDDEN,
            "Forbidden: Admin access required",
        )
            .into_response()
    }
}

pub fn create_router(state: AppState) -> Router {
    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_same_site(tower_sessions::cookie::SameSite::Lax)
        .with_expiry(Expiry::OnInactivity(
            tower_sessions::cookie::time::Duration::hours(1), // 1 hour session
        ));

    // Public/Viewer Routes (Authenticated)
    let viewer_routes = Router::new()
        .route("/dashboard", get(handlers::show_dashboard))
        .route("/services", get(handlers::list_services))
        .route("/services/:id", get(handlers::get_service));

    // Admin Routes (Authenticated + Admin Role)
    let admin_routes = Router::new()
        // Service Management
        .route("/services", post(handlers::create_service))
        .route(
            "/services/:id",
            post(handlers::update_service).delete(handlers::delete_service),
        )
        // Devices
        .route(
            "/devices",
            get(handlers::list_devices).post(handlers::create_device),
        )
        .route(
            "/devices/:id",
            get(handlers::get_device)
                .put(handlers::update_device)
                .delete(handlers::delete_device),
        )
        // Device Interfaces
        .route("/devices/:id/interfaces", post(handlers::create_interface))
        .route(
            "/devices/:device_id/interfaces/:interface_id",
            delete(handlers::delete_interface).put(handlers::update_interface),
        )
        // Device IPs
        .route("/devices/:id/ips", get(handlers::list_device_ips))
        .route("/devices/:id/ips", post(handlers::assign_ip))
        .route(
            "/devices/:device_id/ips/:ip_id",
            delete(handlers::delete_ip_assignment).put(handlers::update_ip),
        )
        // Networks
        .route(
            "/networks",
            get(handlers::list_networks).post(handlers::create_network),
        )
        .route(
            "/networks/:id",
            get(handlers::get_network)
                .put(handlers::update_network)
                .delete(handlers::delete_network),
        )
        // Network IPs
        .route(
            "/networks/:id/ips",
            get(handlers::list_network_ips).post(handlers::create_network_ip),
        )
        // Integrations
        .route(
            "/integrations",
            get(handlers::integrations::list_integrations)
                .post(handlers::integrations::create_integration),
        )
        .route(
            "/integrations/:id/sync",
            post(handlers::integrations::trigger_sync),
        )
        .route(
            "/integrations/:id",
            delete(handlers::integrations::delete_integration),
        )
        // Settings
        .route(
            "/settings",
            get(handlers::settings::get_settings).put(handlers::settings::update_settings),
        )
        .route_layer(middleware::from_fn(require_admin));

    // Combine API routes
    let api_routes = Router::new()
        .merge(viewer_routes)
        .merge(admin_routes)
        .route_layer(middleware::from_fn(auth_middleware));

    // Public API routes (no auth required)
    let public_api = Router::new()
        .route("/settings/public", get(handlers::settings::get_settings));

    // Auth Routes (Public)
    let auth_routes = auth::routes(state.clone());

    // Static file serving for frontend SPA (production)
    let spa_service = ServeDir::new("web/dist")
        .not_found_service(ServeFile::new("web/dist/index.html"));

    Router::new()
        .nest("/api", api_routes)
        .nest("/api", public_api)
        .nest("/auth", auth_routes)
        .fallback_service(spa_service)
        .layer(session_layer)
        .with_state(state)
}

