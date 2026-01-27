use crate::AppState;
use crate::auth::{self, AUTH_SESSION_KEY, AuthUser};
use crate::handlers;
use axum::{
    Router,
    extract::Request,
    middleware::{self, Next},
    response::{IntoResponse, Redirect, Response},
    routing::{delete, get, post},
};
use tower_http::services::ServeDir;
use tower_sessions::{Expiry, MemoryStore, Session, SessionManagerLayer};

async fn auth_middleware(session: Session, mut request: Request, next: Next) -> Response {
    let user: Option<AuthUser> = session.get(AUTH_SESSION_KEY).await.unwrap_or(None);
    if let Some(user) = user {
        request.extensions_mut().insert(user);
        next.run(request).await
    } else {
        Redirect::to("/login").into_response()
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
        (axum::http::StatusCode::FORBIDDEN, "Forbidden").into_response()
    }
}

pub fn create_router(state: AppState) -> Router {
    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_same_site(tower_sessions::cookie::SameSite::Lax)
        .with_expiry(Expiry::OnInactivity(
            tower_sessions::cookie::time::Duration::hours(1),
        ));

    let common_routes = Router::new().route("/", get(handlers::show_dashboard));

    let admin_routes = Router::new()
        // Devices
        .route(
            "/devices",
            get(handlers::list_devices).post(handlers::create_device),
        )
        .route("/devices/new", get(handlers::show_add_device_form))
        .route(
            "/devices/{id}",
            get(handlers::show_device_details).delete(handlers::delete_device),
        )
        .route(
            "/devices/{id}/edit",
            get(handlers::show_edit_device_form).post(handlers::update_device),
        )
        // Interfaces
        .route(
            "/devices/{id}/interfaces/new",
            get(handlers::show_add_interface_form),
        )
        .route("/devices/{id}/interfaces", post(handlers::create_interface))
        .route(
            "/devices/{device_id}/interfaces/{interface_id}",
            delete(handlers::delete_interface),
        )
        // Device IPs
        .route("/devices/{id}/ips/new", get(handlers::show_assign_ip_form))
        .route("/devices/{id}/ips", post(handlers::assign_ip))
        .route(
            "/devices/{device_id}/ips/{ip_id}",
            delete(handlers::delete_ip_assignment),
        )
        // Services
        .route("/services/new", get(handlers::show_add_service_form))
        .route("/services", post(handlers::create_service))
        .route("/services/{id}", delete(handlers::delete_service))
        .route(
            "/services/{id}/edit",
            get(handlers::show_edit_service_form).post(handlers::update_service),
        )
        // Networks
        .route(
            "/networks",
            get(handlers::list_networks).post(handlers::create_network),
        )
        .route("/networks/new", get(handlers::show_add_network_form))
        .route(
            "/networks/{id}",
            get(handlers::show_network_details).delete(handlers::delete_network),
        )
        .route(
            "/networks/{id}/edit",
            get(handlers::show_edit_network_form).post(handlers::update_network),
        )
        .route(
            "/networks/{id}/ips/new",
            get(handlers::show_add_network_ip_form),
        )
        .route("/networks/{id}/ips", post(handlers::create_network_ip))
        .route_layer(middleware::from_fn(require_admin));

    let protected_routes = Router::new()
        .merge(common_routes)
        .merge(admin_routes)
        .route_layer(middleware::from_fn(auth_middleware));

    Router::new()
        .merge(protected_routes)
        .merge(auth::routes(state.clone()))
        // Static files
        .nest_service("/assets", ServeDir::new("assets"))
        .layer(session_layer)
        // Register state (database)
        .with_state(state)
}
