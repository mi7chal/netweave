use crate::db::CreateIpParams;
use crate::handlers::common::{internal_error, json_response, AppResult, ErrorResponse};
use crate::models::{AssignIpPayload, IpStatus};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::net::IpAddr;
use std::str::FromStr;
use uuid::Uuid;

pub async fn assign_ip(
    State(state): State<AppState>,
    Path(device_id): Path<Uuid>,
    Json(payload): Json<AssignIpPayload>,
) -> AppResult<impl IntoResponse> {
    // Basic validation
    let ip_address = IpAddr::from_str(&payload.ip_address).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid IP address".into(),
            }),
        )
    })?;

    let mac_address = payload
        .mac_address
        .as_ref()
        .filter(|m| !m.is_empty())
        .and_then(|m| mac_address::MacAddress::from_str(m).ok());

    let status = match payload.status.as_deref() {
        Some("RESERVED") => IpStatus::Reserved,
        _ => IpStatus::Active,
    };

    let params = CreateIpParams {
        network_id: payload.network_id,
        device_id: Some(device_id),
        interface_id: None,
        ip_address,
        mac_address,
        is_static: payload.is_static,
        status,
        description: None, // Future: Add description field to AssignIpPayload
    };

    let ip = state.db.create_ip(params).await.map_err(internal_error)?;

    json_response(ip)
}

pub async fn delete_ip_assignment(
    State(state): State<AppState>,
    Path((_device_id, ip_id)): Path<(Uuid, Uuid)>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_ip(ip_id).await.map_err(internal_error)?;
    Ok(StatusCode::NO_CONTENT)
}
