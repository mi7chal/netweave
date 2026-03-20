//! # Authentication module
//!
//! Manages authentication, this app uses standard JWT and alterntively OIDC

use crate::db::Db;
use crate::handlers::common::{AppError, AppResult};
use crate::AppState;
use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
    routing::get,
    Json, Router,
};
use bcrypt::{hash, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use tower_sessions::Session;
use uuid::Uuid;

pub mod oidc;

pub const AUTH_SESSION_KEY: &str = "auth_user";

/// User role enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Role {
    #[serde(rename = "ADMIN")]
    Admin,
    #[serde(rename = "VIEWER")]
    Viewer,
}

impl Role {
    pub fn is_admin(&self) -> bool {
        matches!(self, Role::Admin)
    }

    pub fn as_str(&self) -> &str {
        match self {
            Role::Admin => "ADMIN",
            Role::Viewer => "VIEWER",
        }
    }
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl FromStr for Role {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ADMIN" => Ok(Role::Admin),
            "VIEWER" => Ok(Role::Viewer),
            _ => Err(format!("Unknown role: {s}")),
        }
    }
}

/// Ensures that default admin user exsit if one was configured using ENV variables.
/// Should be used only on startup. It won't override existing user data.
pub async fn ensure_default_users(db: &Db) {
    if let (Ok(username), Ok(password)) = (
        std::env::var("DEFAULT_ADMIN_USER"),
        std::env::var("DEFAULT_ADMIN_PASSWORD"),
    ) {
        let hashed = hash(password, DEFAULT_COST).expect("Failed to hash password");
        match db
            .create_user(&username, "admin@homelab.local", Some(&hashed), "ADMIN")
            .await
        {
            Ok(_) => tracing::info!("Default admin user ensured: {}", username),
            Err(e) => tracing::error!("Failed to ensure default admin user: {}", e),
        }
    }
}

/// Authenticated user info
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AuthUser {
    pub id: Uuid,
    pub username: String,
    pub role: Role,
}

/// Login DTO
#[derive(Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
}

/// Auth response
#[derive(Serialize)]
pub struct AuthStatusResponse {
    pub status: &'static str,
    pub message: &'static str,
}

/// Logout response DTO
#[derive(Serialize)]
pub struct LogoutResponse {
    pub status: &'static str,
}

/// OIDC status response DTO
#[derive(Serialize)]
pub struct OidcStatusResponse {
    pub oidc_enabled: bool,
}

/// Change password DTO
#[derive(Deserialize)]
pub struct ChangePasswordPayload {
    pub current_password: Option<String>,
    pub new_password: String,
}

/// Main login handler
pub async fn login_username_password(
    State(state): State<AppState>,
    session: Session,
    axum::Json(payload): axum::Json<LoginPayload>,
) -> AppResult<Json<AuthStatusResponse>> {
    // see [../utils/rate_limiter]
    if !state.login_rate_limiter.check(&payload.username).await {
        return Err(AppError::TooManyRequests(
            "Too many login attempts. Please try again later.".into(),
        ));
    }

    match state.db.get_user_by_username(&payload.username).await {
        Ok(Some(creds)) => {
            if !creds.is_active {
                return Err(AppError::Unauthorized(
                    "Invalid username or password".into(),
                ));
            }

            // OIDC-only user without a password will have an empty or null password_hash
            let Some(password_hash) = creds.password_hash.filter(|h| !h.is_empty()) else {
                return Err(AppError::Unauthorized(
                    "Invalid username or password".into(),
                ));
            };

            if bcrypt::verify(&payload.password, &password_hash).unwrap_or(false) {
                let auth_user = AuthUser {
                    id: creds.id,
                    username: creds.username,
                    role: Role::from_str(&creds.role).unwrap_or(Role::Viewer),
                };

                if let Err(e) = session.insert(AUTH_SESSION_KEY, &auth_user).await {
                    tracing::error!("Failed to set session during login: {}", e);
                    return Err(AppError::Internal(e.into()));
                }

                return Ok(Json(AuthStatusResponse {
                    status: "success",
                    message: "Logged in successfully",
                }));
            }
        }
        Ok(None) => {}
        Err(e) => {
            tracing::error!("Login DB error: {}", e);
            return Err(AppError::Internal(e));
        }
    }

    Err(AppError::Unauthorized(
        "Invalid username or password".into(),
    ))
}

/// Returns self user data
pub async fn me_handler(session: Session) -> AppResult<Json<AuthUser>> {
    let user = session
        .get::<AuthUser>(AUTH_SESSION_KEY)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Failed to read auth session: {}", e);
            None
        });

    match user {
        Some(user) => Ok(Json(user)),
        None => Err(AppError::Unauthorized("Not authenticated".into())),
    }
}

/// Handles user self password change
pub async fn change_password_handler(
    State(state): State<AppState>,
    session: Session,
    Json(payload): Json<ChangePasswordPayload>,
) -> AppResult<Json<AuthStatusResponse>> {
    if payload.new_password.trim().is_empty() {
        return Err(AppError::BadRequest("New password cannot be empty".into()));
    }

    // todo maybe clean this app using native error mapping
    let auth_user = session
        .get::<AuthUser>(AUTH_SESSION_KEY)
        .await
        .ok()
        .flatten()
        .ok_or(AppError::Unauthorized("Not authenticated".into()))?;

    let user = state
        .db
        .get_user_by_id(auth_user.id)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    if !user.is_active {
        return Err(AppError::Forbidden("User is disabled".into()));
    }

    // Require current password only when an existing local password is set.
    // OIDC user can change password without having set one.
    if let Some(existing_hash) = user.password_hash.filter(|h| !h.is_empty()) {
        let Some(current_password) = payload.current_password.as_deref() else {
            return Err(AppError::BadRequest("Current password is required".into()));
        };
        if !bcrypt::verify(current_password, &existing_hash).unwrap_or(false) {
            return Err(AppError::Unauthorized(
                "Current password is incorrect".into(),
            ));
        }
    }

    let new_hash =
        hash(payload.new_password, DEFAULT_COST).map_err(|e| AppError::Internal(e.into()))?;
    let updated = state
        .db
        .update_user_password_hash(auth_user.id, &new_hash)
        .await?;

    if !updated {
        return Err(AppError::NotFound("User not found".into()));
    }

    Ok(Json(AuthStatusResponse {
        status: "success",
        message: "Password changed successfully",
    }))
}

// SECTION: OIDC endpoints
//
// Check [oidc guide](https://openid.net/developers/how-connect-works/)

/// Checks if oidc is enabled
pub async fn check_oidc_handler(
    State(state): State<AppState>,
) -> AppResult<Json<OidcStatusResponse>> {
    let oidc_enabled = state.oidc.read().await.is_some();
    Ok(Json(OidcStatusResponse { oidc_enabled }))
}

const OIDC_NONCE_KEY: &str = "oidc_nonce";
const OIDC_CSRF_KEY: &str = "oidc_csrf";

/// Oidc login handler
pub async fn oidc_login(State(state): State<AppState>, session: Session) -> AppResult<Redirect> {
    let oidc = state.oidc.read().await.clone();

    if let Some(oidc) = oidc {
        let (auth_url, csrf_token, nonce) = oidc.authorization_url();

        if let Err(e) = session.insert(OIDC_NONCE_KEY, nonce.secret().clone()).await {
            tracing::error!("Failed to store OIDC nonce in session: {}", e);
            return Err(AppError::Internal(e.into()));
        }

        if let Err(e) = session
            .insert(OIDC_CSRF_KEY, csrf_token.secret().clone())
            .await
        {
            tracing::error!("Failed to store OIDC CSRF in session: {}", e);
            return Err(AppError::Internal(e.into()));
        }

        Ok(Redirect::to(auth_url.as_str()))
    } else {
        Err(AppError::ServiceUnavailable(
            "OIDC authentication is not configured.".into(),
        ))
    }
}

/// OIDC auth callback parameters
#[derive(Deserialize)]
pub struct AuthCallbackParams {
    code: String,
    state: String,
}

/// OIDC callback endpoint
pub async fn oidc_callback(
    State(state): State<AppState>,
    session: Session,
    Query(params): Query<AuthCallbackParams>,
) -> impl IntoResponse {
    let oidc = match state.oidc.read().await.clone() {
        Some(s) => s,
        None => {
            return (
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                "OIDC authentication is not configured.",
            )
                .into_response()
        }
    };

    let stored_csrf = session
        .get::<String>(OIDC_CSRF_KEY)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Failed to read OIDC CSRF from session: {}", e);
            None
        });
    if stored_csrf.as_deref() != Some(&params.state) {
        return Redirect::to("/login?error=auth_failed").into_response();
    }

    let stored_nonce = session
        .get::<String>(OIDC_NONCE_KEY)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("Failed to read OIDC nonce from session: {}", e);
            None
        });
    let nonce = match stored_nonce {
        Some(n) => openidconnect::Nonce::new(n),
        None => return Redirect::to("/login?error=auth_failed").into_response(),
    };

    let (claims, _id_token) = match oidc.exchange_code(params.code, &nonce).await {
        Ok(res) => res,
        Err(e) => {
            tracing::error!("OIDC code exchange failed: {}", e);
            return Redirect::to("/login?error=auth_failed").into_response();
        }
    };

    let _ = session.remove::<String>(OIDC_NONCE_KEY).await;
    let _ = session.remove::<String>(OIDC_CSRF_KEY).await;

    let email = claims.email().map(|e| e.to_string()).unwrap_or_default();
    let username = claims
        .preferred_username()
        .map(|u| u.to_string())
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
                Err(e) => {
                    tracing::error!("Failed to create OIDC user '{}': {}", username, e);
                    return Redirect::to("/login?error=auth_failed").into_response();
                }
            };
            AuthUser { id, username, role }
        }
        Err(e) => {
            tracing::error!("Database error during OIDC callback: {}", e);
            return Redirect::to("/login?error=auth_failed").into_response();
        }
    };

    if let Err(e) = session.insert(AUTH_SESSION_KEY, &user).await {
        tracing::error!("Failed to set session during OIDC callback: {}", e);
        return Redirect::to("/login?error=auth_failed").into_response();
    }

    Redirect::to("/").into_response()
}

pub async fn logout_handler(session: Session) -> AppResult<Json<LogoutResponse>> {
    if let Err(e) = session.flush().await {
        tracing::warn!("Failed to flush session on logout: {}", e);
    }
    Ok(Json(LogoutResponse { status: "success" }))
}

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/me", get(me_handler))
        .route("/check-oidc", get(check_oidc_handler))
        .route("/login", get(oidc_login).post(login_username_password))
        .route(
            "/change-password",
            axum::routing::post(change_password_handler),
        )
        .route("/callback", get(oidc_callback))
        .route("/logout", get(logout_handler).post(logout_handler))
        .with_state(state)
}
