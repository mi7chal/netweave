use crate::db::Db;
use crate::AppState;
use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
    routing::get,
    Router,
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

pub async fn login_username_password(
    axum::extract::ConnectInfo(addr): axum::extract::ConnectInfo<std::net::SocketAddr>,
    State(state): State<AppState>,
    session: Session,
    axum::Json(payload): axum::Json<LoginPayload>,
) -> impl IntoResponse {
    if !state.login_rate_limiter.check(addr.ip()).await {
        return (
            axum::http::StatusCode::TOO_MANY_REQUESTS,
            axum::Json(serde_json::json!({"error": "Too many login attempts. Please try again later."})),
        )
            .into_response();
    }

    let user_res = state.db.get_user_by_username(&payload.username).await;

    match user_res {
        Ok(Some(creds)) => {
            let password_hash = match creds.password_hash {
                Some(ref h) if !h.is_empty() => h,
                _ => {
                    // OIDC-only user without a password — reject password login
                    return (
                        axum::http::StatusCode::UNAUTHORIZED,
                        axum::Json(serde_json::json!({"error": "Invalid username or password"})),
                    )
                        .into_response();
                }
            };

            let valid = bcrypt::verify(&payload.password, password_hash).unwrap_or(false);
            if valid {
                let role = Role::from_str(&creds.role).unwrap_or(Role::Viewer);
                let auth_user = AuthUser {
                    id: creds.id,
                    username: creds.username,
                    role,
                };
                if let Err(e) = session.insert(AUTH_SESSION_KEY, &auth_user).await {
                    tracing::error!("Failed to set session during login: {}", e);
                    return (
                        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(serde_json::json!({"error": "Internal server error"})),
                    )
                        .into_response();
                }

                return axum::Json(serde_json::json!({
                    "status": "success",
                    "message": "Logged in successfully"
                }))
                .into_response();
            }
        }
        Ok(None) => {}
        Err(e) => {
            tracing::error!("Login DB error: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "Internal server error"})),
            )
                .into_response();
        }
    }

    (
        axum::http::StatusCode::UNAUTHORIZED,
        axum::Json(serde_json::json!({"error": "Invalid username or password"})),
    )
        .into_response()
}

pub async fn me_handler(session: Session) -> impl IntoResponse {
    let user: Option<AuthUser> = match session.get(AUTH_SESSION_KEY).await {
        Ok(u) => u,
        Err(e) => {
            tracing::warn!("Failed to read auth session: {}", e);
            None
        }
    };
    match user {
        Some(user) => axum::Json(serde_json::json!({
            "id": user.id,
            "username": user.username,
            "role": user.role
        }))
        .into_response(),
        None => (
            axum::http::StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({"error": "Not authenticated"})),
        )
            .into_response(),
    }
}

pub async fn check_oidc_handler(State(state): State<AppState>) -> impl IntoResponse {
    axum::Json(serde_json::json!({
        "oidc_enabled": state.oidc.is_some()
    }))
}

const OIDC_NONCE_KEY: &str = "oidc_nonce";
const OIDC_CSRF_KEY: &str = "oidc_csrf";

pub async fn oidc_login(State(state): State<AppState>, session: Session) -> impl IntoResponse {
    if let Some(oidc) = &state.oidc {
        let (auth_url, csrf_token, nonce) = oidc.authorization_url();
        if let Err(e) = session
            .insert(OIDC_NONCE_KEY, nonce.secret().clone())
            .await
        {
            tracing::error!("Failed to store OIDC nonce in session: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Authentication error",
            )
                .into_response();
        }
        if let Err(e) = session
            .insert(OIDC_CSRF_KEY, csrf_token.secret().clone())
            .await
        {
            tracing::error!("Failed to store OIDC CSRF in session: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Authentication error",
            )
                .into_response();
        }
        Redirect::to(auth_url.as_str()).into_response()
    } else {
        (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            "OIDC authentication is not configured.",
        )
            .into_response()
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

    let stored_csrf: Option<String> = match session.get(OIDC_CSRF_KEY).await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("Failed to read OIDC CSRF from session: {}", e);
            None
        }
    };
    if stored_csrf.as_deref() != Some(&params.state) {
        return Redirect::to("/?error=auth_failed").into_response();
    }

    let stored_nonce: Option<String> = match session.get(OIDC_NONCE_KEY).await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("Failed to read OIDC nonce from session: {}", e);
            None
        }
    };
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
    let preferred_username = claims
        .preferred_username()
        .map(|u| u.to_string())
        .unwrap_or(email.clone());

    let username = preferred_username;
    let user_res = state.db.get_user_by_username(&username).await;

    let user = match user_res {
        Ok(Some(creds)) => {
            let role = Role::from_str(&creds.role).unwrap_or(Role::Viewer);
            AuthUser {
                id: creds.id,
                username: creds.username,
                role,
            }
        }
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
            AuthUser {
                id,
                username,
                role,
            }
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

pub async fn logout_handler(session: Session) -> impl IntoResponse {
    if let Err(e) = session.flush().await {
        tracing::warn!("Failed to flush session on logout: {}", e);
    }
    Redirect::to("/")
}

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/me", get(me_handler))
        .route("/check-oidc", get(check_oidc_handler))
        .route("/login", get(oidc_login).post(login_username_password))
        .route("/callback", get(oidc_callback))
        .route("/logout", get(logout_handler))
        .with_state(state)
}
