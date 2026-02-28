use crate::auth::{self, AuthUser, AUTH_SESSION_KEY};
use crate::handlers;
use crate::AppState;
use axum::{
    extract::{Request, State},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Router,
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_sessions::{Expiry, Session, SessionManagerLayer};
use tower_sessions_sqlx_store::PostgresStore;

async fn auth_middleware(
    State(_): State<AppState>,
    session: Session,
    mut request: Request,
    next: Next,
) -> Response {
    let user: Option<AuthUser> = match session.get(AUTH_SESSION_KEY).await {
        Ok(u) => u,
        Err(e) => {
            tracing::warn!("Failed to read auth session: {}", e);
            None
        }
    };

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
        .map(|u| u.role.is_admin())
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

fn build_cors_layer() -> CorsLayer {
    use axum::http::{header, Method};

    let allowed_origins = std::env::var("ALLOWED_ORIGINS").unwrap_or_default();

    let methods = vec![
        Method::GET,
        Method::POST,
        Method::PUT,
        Method::DELETE,
        Method::OPTIONS,
    ];
    let headers = vec![header::CONTENT_TYPE, header::AUTHORIZATION, header::COOKIE];

    if allowed_origins.is_empty() {
        CorsLayer::new()
            .allow_methods(methods)
            .allow_headers(headers)
    } else {
        let origins: Vec<axum::http::HeaderValue> = allowed_origins
            .split(',')
            .filter_map(|o| o.trim().parse().ok())
            .collect();

        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods(methods)
            .allow_headers(headers)
            .allow_credentials(true)
    }
}

pub async fn create_router(state: AppState) -> anyhow::Result<Router> {
    let session_store = PostgresStore::new(state.db.pool.clone());
    session_store.migrate().await.map_err(|e| {
        anyhow::anyhow!("Failed to migrate session store: {}", e)
    })?;

    let secure_cookie = std::env::var("SESSION_SECURE_COOKIE")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);

    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(secure_cookie)
        .with_http_only(true)
        .with_same_site(tower_sessions::cookie::SameSite::Lax)
        .with_expiry(Expiry::OnInactivity(
            tower_sessions::cookie::time::Duration::hours(1),
        ));

    // Viewer routes (authenticated, any role)
    let viewer_routes = Router::new()
        .route("/dashboard", get(handlers::show_dashboard))
        .route("/services", get(handlers::list_services))
        .route("/services/:id", get(handlers::get_service));

    // Admin routes (authenticated + admin role)
    let admin_routes = Router::new()
        .route("/services", post(handlers::create_service))
        .route(
            "/services/:id",
            post(handlers::update_service).delete(handlers::delete_service),
        )
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
        .route("/devices/:id/interfaces", post(handlers::create_interface))
        .route(
            "/devices/:device_id/interfaces/:interface_id",
            delete(handlers::delete_interface).put(handlers::update_interface),
        )
        .route("/devices/:id/ips", get(handlers::list_device_ips))
        .route("/devices/:id/ips", post(handlers::assign_ip))
        .route(
            "/devices/:device_id/ips/:ip_id",
            delete(handlers::delete_ip_assignment).put(handlers::update_ip),
        )
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
        .route(
            "/networks/:id/ips",
            get(handlers::list_network_ips).post(handlers::create_network_ip),
        )
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
        .route(
            "/settings",
            get(handlers::settings::get_settings).put(handlers::settings::update_settings),
        )
        .route_layer(middleware::from_fn(require_admin));

    let api_routes = Router::new()
        .merge(viewer_routes)
        .merge(admin_routes)
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    let public_api = Router::new().route(
        "/settings/public",
        get(handlers::settings::get_public_settings),
    );

    let auth_routes = auth::routes(state.clone());

    let spa_service =
        ServeDir::new("web/dist").not_found_service(ServeFile::new("web/dist/index.html"));

    Ok(Router::new()
        .nest("/api", api_routes)
        .nest("/api", public_api)
        .nest("/auth", auth_routes)
        .fallback_service(spa_service)
        .layer(build_cors_layer())
        .layer(session_layer)
        .with_state(state))
}
