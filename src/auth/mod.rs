//! # Authentication module
//!
//! Manages authentication using server-side sessions (tower-sessions) and,
//! optionally, OIDC for login.

use crate::db::Db;
use crate::handlers::common::{AppError, AppResult};
use crate::AppState;
use axum::{extract::State, routing::get, Json, Router};
use bcrypt::{hash, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use tower_sessions::Session;
use uuid::Uuid;

pub mod oidc;
mod oidc_handlers;

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
        let hashed = match hash(password, DEFAULT_COST) {
            Ok(hashed) => hashed,
            Err(e) => {
                tracing::error!("Failed to hash default admin password: {}", e);
                return;
            }
        };
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

pub async fn logout_handler(session: Session) -> AppResult<Json<LogoutResponse>> {
    if let Err(e) = session.flush().await {
        tracing::warn!("Failed to flush session on logout: {}", e);
    }
    Ok(Json(LogoutResponse { status: "success" }))
}

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/me", get(me_handler))
        .route("/check-oidc", get(oidc_handlers::check_oidc_handler))
        .route(
            "/login",
            get(oidc_handlers::oidc_login).post(login_username_password),
        )
        .route(
            "/change-password",
            axum::routing::post(change_password_handler),
        )
        .route("/callback", get(oidc_handlers::oidc_callback))
        .route("/logout", get(logout_handler).post(logout_handler))
        .with_state(state)
}
