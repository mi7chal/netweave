use axum::{http::StatusCode, Json};
use serde::Serialize;

// --- API RESPONSE WRAPPERS ---

/// Standard error response format
#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

// --- HELPER WRAPPERS ---

/// Result type for API handlers
pub type AppResult<T> = Result<T, (StatusCode, Json<ErrorResponse>)>;

/// Convert internal errors (like DB errors) to 500 API responses
pub fn internal_error<E>(err: E) -> (StatusCode, Json<ErrorResponse>)
where
    E: std::fmt::Display,
{
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse {
            error: err.to_string(),
        }),
    )
}

/// Helper to return JSON data or an error
pub fn json_response<T: Serialize>(data: T) -> AppResult<Json<T>> {
    Ok(Json(data))
}
