use super::{AuthUser, OidcStatusResponse, Role, AUTH_SESSION_KEY};
use crate::handlers::common::{AppError, AppResult};
use crate::AppState;
use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
    Json,
};
use std::str::FromStr;
use tower_sessions::Session;

const OIDC_NONCE_KEY: &str = "oidc_nonce";
const OIDC_CSRF_KEY: &str = "oidc_csrf";

/// OIDC auth callback parameters.
#[derive(serde::Deserialize)]
pub struct AuthCallbackParams {
    code: String,
    state: String,
}

/// Checks if OIDC is enabled.
pub async fn check_oidc_handler(
    State(state): State<AppState>,
) -> AppResult<Json<OidcStatusResponse>> {
    let oidc_enabled = state.oidc.read().await.is_some();
    Ok(Json(OidcStatusResponse { oidc_enabled }))
}

/// OIDC login handler.
pub async fn oidc_login(State(state): State<AppState>, session: Session) -> AppResult<Redirect> {
    let oidc = state.oidc.read().await.clone();

    if let Some(oidc) = oidc {
        let (auth_url, csrf_token, nonce) = oidc.authorization_url();

        if let Err(error) = session.insert(OIDC_NONCE_KEY, nonce.secret().clone()).await {
            tracing::error!("Failed to store OIDC nonce in session: {}", error);
            return Err(AppError::Internal(error.into()));
        }

        if let Err(error) = session
            .insert(OIDC_CSRF_KEY, csrf_token.secret().clone())
            .await
        {
            tracing::error!("Failed to store OIDC CSRF in session: {}", error);
            return Err(AppError::Internal(error.into()));
        }

        Ok(Redirect::to(auth_url.as_str()))
    } else {
        Err(AppError::ServiceUnavailable(
            "OIDC authentication is not configured.".into(),
        ))
    }
}

/// OIDC callback endpoint.
pub async fn oidc_callback(
    State(state): State<AppState>,
    session: Session,
    Query(params): Query<AuthCallbackParams>,
) -> impl IntoResponse {
    let oidc = match state.oidc.read().await.clone() {
        Some(service) => service,
        None => {
            return (
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                "OIDC authentication is not configured.",
            )
                .into_response();
        }
    };

    let stored_csrf = session
        .get::<String>(OIDC_CSRF_KEY)
        .await
        .unwrap_or_else(|error| {
            tracing::warn!("Failed to read OIDC CSRF from session: {}", error);
            None
        });
    if stored_csrf.as_deref() != Some(&params.state) {
        return Redirect::to("/login?error=auth_failed").into_response();
    }

    let stored_nonce = session
        .get::<String>(OIDC_NONCE_KEY)
        .await
        .unwrap_or_else(|error| {
            tracing::warn!("Failed to read OIDC nonce from session: {}", error);
            None
        });
    let nonce = match stored_nonce {
        Some(nonce) => openidconnect::Nonce::new(nonce),
        None => return Redirect::to("/login?error=auth_failed").into_response(),
    };

    let (claims, _id_token) = match oidc.exchange_code(params.code, &nonce).await {
        Ok(result) => result,
        Err(error) => {
            tracing::error!("OIDC code exchange failed: {}", error);
            return Redirect::to("/login?error=auth_failed").into_response();
        }
    };

    let _ = session.remove::<String>(OIDC_NONCE_KEY).await;
    let _ = session.remove::<String>(OIDC_CSRF_KEY).await;

    let email = claims
        .email()
        .map(|value| value.to_string())
        .unwrap_or_default();
    let username = claims
        .preferred_username()
        .map(|value| value.to_string())
        .unwrap_or_else(|| email.clone());

    let user = match state.db.get_user_by_username(&username).await {
        Ok(Some(creds)) if !creds.is_active => {
            tracing::warn!("OIDC login rejected for inactive user '{}'", username);
            return Redirect::to("/login?error=auth_failed").into_response();
        }
        Ok(Some(creds)) => AuthUser {
            id: creds.id,
            username: creds.username,
            role: Role::from_str(&creds.role).unwrap_or(Role::Viewer),
        },
        Ok(None) => {
            let auto_import = state
                .db
                .get_setting("oidc_auto_import")
                .await
                .ok()
                .flatten()
                .unwrap_or_else(|| "false".to_string());

            if auto_import != "true" {
                tracing::warn!(
                    "OIDC auto-import is disabled. Rejecting login for new user '{}'",
                    username
                );
                return Redirect::to("/login?error=auth_failed").into_response();
            }

            let role = Role::Viewer;
            let id = match state
                .db
                .create_user(&username, &email, None, role.as_str())
                .await
            {
                Ok(id) => id,
                Err(error) => {
                    tracing::error!("Failed to create OIDC user '{}': {}", username, error);
                    return Redirect::to("/login?error=auth_failed").into_response();
                }
            };
            AuthUser { id, username, role }
        }
        Err(error) => {
            tracing::error!("Database error during OIDC callback: {}", error);
            return Redirect::to("/login?error=auth_failed").into_response();
        }
    };

    if let Err(error) = session.insert(AUTH_SESSION_KEY, &user).await {
        tracing::error!("Failed to set session during OIDC callback: {}", error);
        return Redirect::to("/login?error=auth_failed").into_response();
    }

    Redirect::to("/").into_response()
}
