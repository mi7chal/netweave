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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AuthUser {
    pub id: Uuid,
    pub username: String,
    pub role: Role,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthStatusResponse {
    pub status: &'static str,
    pub message: &'static str,
}

#[derive(Serialize)]
pub struct LogoutResponse {
    pub status: &'static str,
}

#[derive(Serialize)]
pub struct OidcStatusResponse {
    pub oidc_enabled: bool,
}

pub async fn login_username_password(
    State(state): State<AppState>,
    session: Session,
    axum::Json(payload): axum::Json<LoginPayload>,
) -> AppResult<Json<AuthStatusResponse>> {
    if !state.login_rate_limiter.check(&payload.username).await {
        return Err(AppError::TooManyRequests(
            "Too many login attempts. Please try again later.".into(),
        ));
    }

    match state.db.get_user_by_username(&payload.username).await {
        Ok(Some(creds)) => {
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

pub async fn check_oidc_handler(
    State(state): State<AppState>,
) -> AppResult<Json<OidcStatusResponse>> {
    Ok(Json(OidcStatusResponse {
        oidc_enabled: state.oidc.is_some(),
    }))
}

const OIDC_NONCE_KEY: &str = "oidc_nonce";
const OIDC_CSRF_KEY: &str = "oidc_csrf";

pub async fn oidc_login(State(state): State<AppState>, session: Session) -> AppResult<Redirect> {
    if let Some(oidc) = &state.oidc {
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

#[derive(Deserialize)]
pub struct AuthCallbackParams {
    code: String,
    state: String,
}

pub async fn oidc_callback(
    State(state): State<AppState>,
    session: Session,
    Query(params): Query<AuthCallbackParams>,
) -> impl IntoResponse {
    let oidc = match &state.oidc {
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
        return Redirect::to("/?error=auth_failed").into_response();
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
        None => return Redirect::to("/?error=auth_failed").into_response(),
    };

    let (claims, _id_token) = match oidc.exchange_code(params.code, &nonce).await {
        Ok(res) => res,
        Err(e) => {
            tracing::error!("OIDC code exchange failed: {}", e);
            return Redirect::to("/?error=auth_failed").into_response();
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
        Ok(Some(creds)) => AuthUser {
            id: creds.id,
            username: creds.username,
            role: Role::from_str(&creds.role).unwrap_or(Role::Viewer),
        },
        Ok(None) => {
            let id = Uuid::now_v7();
            let role = Role::Viewer;

            if let Err(e) = state
                .db
                .create_user(&username, &email, None, role.as_str())
                .await
            {
                tracing::error!("Failed to create OIDC user '{}': {}", username, e);
                return Redirect::to("/?error=auth_failed").into_response();
            }
            AuthUser { id, username, role }
        }
        Err(e) => {
            tracing::error!("Database error during OIDC callback: {}", e);
            return Redirect::to("/?error=auth_failed").into_response();
        }
    };

    if let Err(e) = session.insert(AUTH_SESSION_KEY, &user).await {
        tracing::error!("Failed to set session during OIDC callback: {}", e);
        return Redirect::to("/?error=auth_failed").into_response();
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
        .route("/callback", get(oidc_callback))
        .route("/logout", get(logout_handler).post(logout_handler))
        .with_state(state)
}
