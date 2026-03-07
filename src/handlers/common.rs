use crate::models::DashboardService;
use crate::{AppState, ServiceStatus};

pub use crate::models::ServiceWithStatus;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use std::net::IpAddr;
use std::str::FromStr;

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

pub enum AppError {
    Internal(anyhow::Error),
    BadRequest(String),
    NotFound(String),
    Unauthorized(String),
    Forbidden(String),
    TooManyRequests(String),
    ServiceUnavailable(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            AppError::Internal(err) => {
                tracing::error!("Internal error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred.".to_string(),
                )
            }
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
            AppError::TooManyRequests(msg) => (StatusCode::TOO_MANY_REQUESTS, msg),
            AppError::ServiceUnavailable(msg) => (StatusCode::SERVICE_UNAVAILABLE, msg),
        };
        (status, Json(ErrorResponse { error: msg })).into_response()
    }
}

impl<E: Into<anyhow::Error>> From<E> for AppError {
    fn from(err: E) -> Self {
        AppError::Internal(err.into())
    }
}

pub type AppResult<T> = Result<T, AppError>;

pub fn parse_ip_addr(value: &str) -> AppResult<IpAddr> {
    IpAddr::from_str(value).map_err(|_| AppError::BadRequest("Invalid IP address".into()))
}

pub fn parse_ip_status_or_default(value: Option<&str>) -> crate::models::IpStatus {
    value
        .and_then(|s| crate::models::IpStatus::from_str(s).ok())
        .unwrap_or(crate::models::IpStatus::Active)
}

pub async fn enrich_services_with_status(
    state: &AppState,
    services: Vec<DashboardService>,
) -> Vec<ServiceWithStatus> {
    let statuses = state.service_statuses.read().await;
    services
        .into_iter()
        .map(|s| {
            let status = statuses.get(&s.id).cloned().unwrap_or(ServiceStatus::Unknown);
            let uptime_percentage = if s.total_checks > 0 {
                (s.successful_checks as f64 / s.total_checks as f64) * 100.0
            } else {
                100.0
            };
            ServiceWithStatus {
                service: s,
                status: format!("{:?}", status).to_uppercase(),
                uptime_percentage,
            }
        })
        .collect()
}
