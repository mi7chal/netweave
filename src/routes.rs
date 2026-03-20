use crate::auth::{self, AuthUser, AUTH_SESSION_KEY};
use crate::handlers;
use crate::AppState;
use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Router,
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_sessions::{Expiry, Session, SessionManagerLayer};
use tower_sessions_sqlx_store::PostgresStore;

/// Authentication middleware. Authentication is based on asymmetricaly encrypted JWT, check [`auth`] for more info.
async fn auth_middleware(
    _: State<AppState>,
    session: Session,
    mut request: Request,
    next: Next,
) -> Response {
    // todo clean this
    let Ok(Some(user)) = session.get::<AuthUser>(AUTH_SESSION_KEY).await else {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    };

    request.extensions_mut().insert(user);
    next.run(request).await
}

/// Additional auth middleware for pages that may or may not require authentication. When `homepage_public` setting
/// is enabled this middleware skips authentication.
async fn optional_auth_middleware(
    state: State<AppState>,
    session: Session,
    mut request: Request,
    next: Next,
) -> Response {
    // attempt to authenticate, ignore on error
    if let Ok(Some(user)) = session.get::<AuthUser>(AUTH_SESSION_KEY).await {
        request.extensions_mut().insert(user);
        return next.run(request).await;
    }

    // Check if homepage is public
    let homepage_public = state
        .db
        .get_setting("homepage_public")
        .await
        .ok()
        .flatten()
        .map(|v| v == "true")
        .unwrap_or(false);

    if homepage_public {
        // Allow access without authentication
        return next.run(request).await;
    }

    // Otherwise, run standard authentication middleware
    return auth_middleware(state, session, request, next).await;
}

/// Admin access check
async fn require_admin(request: Request, next: Next) -> Response {
    let is_admin = request
        .extensions()
        .get::<AuthUser>()
        .map(|u| u.role.is_admin())
        .unwrap_or(false);

    if is_admin {
        return next.run(request).await;
    }

    (
        axum::http::StatusCode::FORBIDDEN,
        "Forbidden: Admin access required",
    )
        .into_response()
}

/// As we all love cors, it configures it
fn build_cors_layer(allowed_origins: &[String]) -> CorsLayer {
    use axum::http::{header, Method};

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
            .iter()
            .filter_map(|o| o.trim().parse().ok())
            .collect();

        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods(methods)
            .allow_headers(headers)
            .allow_credentials(true)
    }
}

// SECTION: routes
// todo refactor

fn dashboard_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(handlers::show_dashboard))
        .route_layer(middleware::from_fn_with_state(
            state,
            optional_auth_middleware,
        ))
}

fn viewer_routes() -> Router<AppState> {
    Router::new()
        .route("/services", get(handlers::list_services))
        .route("/services/:id", get(handlers::get_service))
}

fn admin_service_routes() -> Router<AppState> {
    Router::new()
        .route("/services", post(handlers::create_service))
        .route(
            "/services/:id",
            put(handlers::update_service).delete(handlers::delete_service),
        )
}

fn admin_device_routes() -> Router<AppState> {
    Router::new()
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
}

fn admin_network_routes() -> Router<AppState> {
    Router::new()
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
}

fn admin_integration_routes() -> Router<AppState> {
    Router::new()
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
}

fn admin_settings_routes() -> Router<AppState> {
    Router::new().route(
        "/settings",
        get(handlers::settings::get_settings).put(handlers::settings::update_settings),
    )
}

fn admin_user_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/users",
            get(handlers::list_users).post(handlers::create_user),
        )
        .route(
            "/users/:id",
            get(handlers::get_user)
                .put(handlers::update_user)
                .delete(handlers::delete_user),
        )
}

fn admin_routes() -> Router<AppState> {
    Router::new()
        .merge(admin_service_routes())
        .merge(admin_device_routes())
        .merge(admin_network_routes())
        .merge(admin_integration_routes())
        .merge(admin_settings_routes())
        .merge(admin_user_routes())
        .route_layer(middleware::from_fn(require_admin))
}

fn auth_protected_api_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .merge(viewer_routes())
        .merge(admin_routes())
        .route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

/// Creates main app router
// todo refactor
pub async fn create_router(state: AppState) -> anyhow::Result<Router> {
    let session_store = PostgresStore::new(state.db.pool.clone());
    session_store
        .migrate()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to migrate session store: {}", e))?;

    let key = tower_sessions::cookie::Key::from(state.config.session_secret.as_bytes());

    let session_layer = SessionManagerLayer::new(session_store)
        .with_signed(key)
        .with_secure(state.config.session_secure_cookie)
        .with_http_only(true)
        .with_same_site(tower_sessions::cookie::SameSite::Lax)
        .with_expiry(Expiry::OnInactivity(
            tower_sessions::cookie::time::Duration::hours(1),
        ));

    let dashboard_route = dashboard_routes(state.clone());
    let api_routes = auth_protected_api_routes(state.clone());

    let public_api = Router::new().route(
        "/settings/public",
        get(handlers::settings::get_public_settings),
    );

    let auth_routes = auth::routes(state.clone());

    let spa_service =
        ServeDir::new("web/dist").not_found_service(ServeFile::new("web/dist/index.html"));

    Ok(Router::new()
        .nest("/api", dashboard_route)
        .nest("/api", api_routes)
        .nest("/api", public_api)
        .nest("/api/auth", auth_routes)
        .fallback_service(spa_service)
        .layer(build_cors_layer(&state.config.allowed_origins))
        .layer(session_layer)
        .with_state(state))
}
