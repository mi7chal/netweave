/// Authentication module for Homelab Manager
/// Handles user login and session management.
///
/// Logout is not implemented yet.
///
/// Uses bcrypt for password hashing and verification.
///
use crate::AppState;
use crate::db::Db;
use askama::Template;
use axum::{
    Router,
    extract::{Form, State},
    response::{Html, IntoResponse, Redirect},
    routing::get,
};
use bcrypt::{DEFAULT_COST, hash, verify};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;
use uuid::Uuid;

pub const AUTH_SESSION_KEY: &str = "auth_user";

/// Creates default users from env
pub async fn ensure_default_users(db: &Db) {
    if let (Ok(username), Ok(password)) = (
        std::env::var("DEFAULT_ADMIN_USER"),
        std::env::var("DEFAULT_ADMIN_PASSWORD"),
    ) {
        let hashed = hash(password, DEFAULT_COST).expect("Failed to hash password");

        // use random email
        match db
            .create_user(&username, "admin@homelab.local", &hashed, "ADMIN")
            .await
        {
            Ok(_) => tracing::info!("Default admin user ensured: {}", username),
            Err(e) => tracing::error!("Failed to ensure default admin user: {}", e),
        }
    }

    if let (Ok(username), Ok(password)) = (
        std::env::var("DEFAULT_VIEWER_USER"),
        std::env::var("DEFAULT_VIEWER_PASSWORD"),
    ) {
        let hashed = hash(password, DEFAULT_COST).expect("Failed to hash password");
        // use some random email
        match db
            .create_user(&username, "viewer@homelab.local", &hashed, "VIEWER")
            .await
        {
            Ok(_) => tracing::info!("Default viewer user ensured: {}", username),
            Err(e) => tracing::error!("Failed to ensure default viewer user: {}", e),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AuthUser {
    pub id: Uuid,
    pub username: String,
    pub role: String, // "ADMIN" or "VIEWER"
}

#[derive(Template)]
#[template(path = "login.html")]
struct LoginTemplate {
    error: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    username: String,
    password: String,
}
/// Show login page
pub async fn login_page(session: Session) -> impl IntoResponse {
    // redirect if logged in
    if session
        .get::<AuthUser>(AUTH_SESSION_KEY)
        .await
        .unwrap_or(None)
        .is_some()
    {
        return Redirect::to("/").into_response();
    }

    Html(LoginTemplate { error: None }.render().unwrap()).into_response()
}
/// Handle login submission
pub async fn login_submit(
    State(state): State<AppState>,
    session: Session,
    Form(payload): Form<LoginPayload>,
) -> impl IntoResponse {
    let user_result = state.db.get_user_by_username(&payload.username).await;

    match user_result {
        Ok(Some((id, username, role, password_hash))) => {
            let valid = verify(&payload.password, &password_hash).unwrap_or(false);
            if valid {
                let auth_user = AuthUser { id, username, role };
                session
                    .insert(AUTH_SESSION_KEY, auth_user)
                    .await
                    .expect("Failed to set session");
                return Redirect::to("/").into_response();
            }
        }
        Ok(None) => {
            // User not found - skip
        }
        Err(e) => {
            return Html(
                LoginTemplate {
                    error: Some(format!("Database error: {}", e)),
                }
                .render()
                .unwrap(),
            )
            .into_response();
        }
    }

    Html(
        LoginTemplate {
            error: Some("Invalid username or password".to_string()),
        }
        .render()
        .unwrap(),
    )
    .into_response()
}

/// Logout
pub async fn logout_handler(session: Session) -> impl IntoResponse {
    session.flush().await.ok();
    Redirect::to("/login")
}

/// Public router for auth module
pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/login", get(login_page).post(login_submit))
        .route("/logout", get(logout_handler))
        .with_state(state)
}
