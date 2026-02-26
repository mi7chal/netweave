use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

// --- API RESPONSE WRAPPERS ---

/// Standard error response format
#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

pub enum AppError {
    Internal(anyhow::Error),
    BadRequest(String),
    NotFound(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            AppError::Internal(err) => {
                tracing::error!("AppError: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "An internal server error occurred.".to_string())
            },
            AppError::BadRequest(msg) => {
                (StatusCode::BAD_REQUEST, msg)
            },
            AppError::NotFound(msg) => {
                (StatusCode::NOT_FOUND, msg)
            }
        };
        
        let body = Json(ErrorResponse {
            error: msg,
        });
        (status, body).into_response()
    }
}

impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        AppError::Internal(err.into())
    }
}

// --- HELPER WRAPPERS ---

/// Result type for API handlers
pub type AppResult<T> = Result<T, AppError>;

/// Convert internal errors. Kept for backwards compatibility across handlers.
pub fn internal_error<E>(err: E) -> AppError
where
    E: Into<anyhow::Error>,
{
    AppError::Internal(err.into())
}

/// Helper to return JSON data
pub fn json_response<T: Serialize>(data: T) -> AppResult<Json<T>> {
    Ok(Json(data))
}
