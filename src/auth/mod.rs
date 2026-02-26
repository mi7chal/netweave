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
use tower_sessions::Session;
use uuid::Uuid;

pub mod oidc;

pub const AUTH_SESSION_KEY: &str = "auth_user";

/// Creates default users from env
pub async fn ensure_default_users(db: &Db) {
    if let (Ok(username), Ok(password)) = (
        std::env::var("DEFAULT_ADMIN_USER"),
        std::env::var("DEFAULT_ADMIN_PASSWORD"),
    ) {
        let hashed = hash(password, DEFAULT_COST).expect("Failed to hash password");
        match db
            .create_user(&username, "admin@homelab.local", &hashed, "ADMIN")
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
    pub role: String,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
}

pub async fn login_username_password(
    State(state): State<AppState>,
    session: Session,
    axum::Json(payload): axum::Json<LoginPayload>,
) -> impl IntoResponse {
    let user_res = state.db.get_user_by_username(&payload.username).await;

    match user_res {
        Ok(Some((id, username, role, password_hash))) => {
            let valid = bcrypt::verify(&payload.password, &password_hash).unwrap_or(false);
            if valid {
                let auth_user = AuthUser { id, username, role };
                session
                    .insert(AUTH_SESSION_KEY, auth_user)
                    .await
                    .expect("Failed to set session");

                return axum::Json(serde_json::json!({
                    "status": "success",
                    "message": "Logged in successfully"
                }))
                .into_response();
            }
        }
        Ok(None) => {} // User not found
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

pub async fn oidc_login(State(state): State<AppState>) -> impl IntoResponse {
    if let Some(oidc) = &state.oidc {
        let (auth_url, _csrf_token, _nonce) = oidc.get_authorization_url();
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
    _state: String, // CSRF token usually
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

    let (claims, _id_token) = match oidc.exchange_code(params.code).await {
        Ok(res) => res,
        Err(e) => return format!("Failed to exchange code: {}", e).into_response(),
    };

    let email = claims.email().map(|e| e.to_string()).unwrap_or_default();
    let preferred_username = claims
        .preferred_username()
        .map(|u| u.to_string())
        .unwrap_or(email.clone());

    // Find or create user
    // For now, if user exists, log them in. If not, create them.
    // We assume default role is VIEWER for new users, unless specified otherwise.

    // We need a db method to get_user_by_email or similar. Using username for now.
    // If username conflict, we might have issues.

    // Simplification: Just create or retrieve user by username (email as username preferred)
    // Actually our DB uses username. We should use email as username or preferred_username.
    let username = preferred_username;

    let user_res = state.db.get_user_by_username(&username).await;

    let user = match user_res {
        Ok(Some((id, u, r, _))) => AuthUser {
            id,
            username: u,
            role: r,
        }, // Already exists
        Ok(None) => {
            // Create new user
            let id = Uuid::now_v7();
            let hashed_pw = "OIDC_AUTH_ONLY"; // Placeholder
            let role = "VIEWER"; // Default role
                                 // TODO: Allow admin email whitelist in env?

            if let Err(e) = state
                .db
                .create_user(&username, &email, hashed_pw, role)
                .await
            {
                return format!("Failed to create user: {}", e).into_response();
            }
            AuthUser {
                id,
                username,
                role: role.to_string(),
            }
        }
        Err(e) => return format!("Database error: {}", e).into_response(),
    };

    session
        .insert(AUTH_SESSION_KEY, user)
        .await
        .expect("Failed to set session");

    Redirect::to("/").into_response()
}

pub async fn logout_handler(session: Session) -> impl IntoResponse {
    session.flush().await.ok();
    Redirect::to("/")
}

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/login", get(oidc_login).post(login_username_password))
        .route("/callback", get(oidc_callback))
        .route("/logout", get(logout_handler))
        .with_state(state)
}
