use crate::handlers;
use crate::AppState;
use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};

use super::middleware::{auth_middleware, optional_auth_middleware, require_admin};

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

pub(super) fn dashboard_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(handlers::show_dashboard))
        .route_layer(middleware::from_fn_with_state(
            state,
            optional_auth_middleware,
        ))
}

pub(super) fn auth_protected_api_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .merge(viewer_routes())
        .merge(admin_routes())
        .route_layer(middleware::from_fn_with_state(state, auth_middleware))
}

pub(super) fn public_api_routes() -> Router<AppState> {
    Router::new().route(
        "/settings/public",
        get(handlers::settings::get_public_settings),
    )
}
