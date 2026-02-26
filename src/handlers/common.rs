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

                let mut error_msg = "An internal server error occurred.".to_string();

                // Check for database connection issues specifically
                // sea_orm errors
                if let Some(db_err) = err.downcast_ref::<sea_orm::DbErr>() {
                    tracing::debug!("Detected SeaORM error: {}", db_err);
                    match db_err {
                        sea_orm::DbErr::Conn(msg) => {
                            error_msg = format!("Database connection error: {}", msg);
                        }
                        sea_orm::DbErr::ConnectionAcquire(msg) => {
                            error_msg = format!("Database connection error: {}", msg);
                        }
                        _ => {
                            // If it's a dry sea_orm error but not connection related, we might still want more info in dev
                        }
                    }
                }
                // direct sqlx errors (sometimes they aren't wrapped by sea_orm in a way that downcasts to DbErr directly)
                else if let Some(sqlx_err) = err.downcast_ref::<sqlx::Error>() {
                    tracing::debug!("Detected sqlx error: {}", sqlx_err);
                    match sqlx_err {
                        sqlx::Error::Io(_) | sqlx::Error::PoolClosed | sqlx::Error::PoolTimedOut => {
                            error_msg = format!("Database connection error: {}", sqlx_err);
                        }
                        _ => {}
                    }
                }

                (StatusCode::INTERNAL_SERVER_ERROR, error_msg)
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
