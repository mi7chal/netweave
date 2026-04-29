use crate::auth::{AuthUser, AUTH_SESSION_KEY};
use crate::AppState;
use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use tower_sessions::Session;

/// Authentication middleware backed by server-side sessions (tower-sessions).
/// The authenticated [`AuthUser`] is loaded from session storage and attached
/// to request extensions for downstream handlers.
pub(super) async fn auth_middleware(
    _: State<AppState>,
    session: Session,
    mut request: Request,
    next: Next,
) -> Response {
    let Ok(Some(user)) = session.get::<AuthUser>(AUTH_SESSION_KEY).await else {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    };

    request.extensions_mut().insert(user);
    next.run(request).await
}

/// Additional auth middleware for pages that may or may not require authentication. When
/// `homepage_public` setting is enabled this middleware skips authentication.
pub(super) async fn optional_auth_middleware(
    state: State<AppState>,
    session: Session,
    mut request: Request,
    next: Next,
) -> Response {
    if let Ok(Some(user)) = session.get::<AuthUser>(AUTH_SESSION_KEY).await {
        request.extensions_mut().insert(user);
        return next.run(request).await;
    }

    let homepage_public = state
        .db
        .get_setting("homepage_public")
        .await
        .ok()
        .flatten()
        .map(|value| value == "true")
        .unwrap_or(false);

    if homepage_public {
        return next.run(request).await;
    }

    auth_middleware(state, session, request, next).await
}

/// Admin access check.
pub(super) async fn require_admin(request: Request, next: Next) -> Response {
    let is_admin = request
        .extensions()
        .get::<AuthUser>()
        .map(|user| user.role.is_admin())
        .unwrap_or(false);

    if is_admin {
        return next.run(request).await;
    }

    (StatusCode::FORBIDDEN, "Forbidden: Admin access required").into_response()
}
