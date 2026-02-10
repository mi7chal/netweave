use crate::db::{CreateIpParams, CreateNetworkParams};
use crate::handlers::common::{internal_error, json_response, AppResult, ErrorResponse};
use crate::models::{CreateNetworkIpPayload, CreateNetworkPayload, IpStatus, UpdateNetworkPayload};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::types::ipnetwork::IpNetwork;
use std::str::FromStr;
use uuid::Uuid;

/// List all networks
pub async fn list_networks(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let networks = state.db.list_networks().await.map_err(internal_error)?;
    json_response(networks)
}

/// Create a new network
pub async fn create_network(
    State(state): State<AppState>,
    Json(payload): Json<CreateNetworkPayload>,
) -> AppResult<impl IntoResponse> {
    // Basic validation
    let cidr = IpNetwork::from_str(&payload.cidr).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Invalid CIDR: {}", e),
            }),
        )
    })?;

    let gateway = payload
        .gateway
        .as_deref()
        .and_then(|g| std::net::IpAddr::from_str(g).ok());

    let dns_servers = payload.dns_servers.as_ref().map(|s| {
        s.split(',')
            .filter_map(|ip| std::net::IpAddr::from_str(ip.trim()).ok())
            .collect()
    });

    let params = CreateNetworkParams {
        name: payload.name,
        cidr,
        vlan_id: payload.vlan_id,
        gateway,
        dns_servers,
        description: payload.description,
    };

    let network = state
        .db
        .create_network(params)
        .await
        .map_err(internal_error)?;

    json_response(network)
}

/// Get network details
pub async fn get_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let network = state
        .db
        .get_network(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Network not found".into(),
            }),
        ))?;

    json_response(network)
}

/// Update network
pub async fn update_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateNetworkPayload>,
) -> AppResult<impl IntoResponse> {
    let cidr = IpNetwork::from_str(&payload.cidr).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Invalid CIDR: {}", e),
            }),
        )
    })?;

    let params = CreateNetworkParams {
        name: payload.name,
        cidr,
        vlan_id: payload.vlan_id,
        gateway: payload.gateway.and_then(|s| s.parse().ok()),
        dns_servers: payload
            .dns_servers
            .map(|s| s.split(',').filter_map(|p| p.trim().parse().ok()).collect()),
        description: payload.description,
    };

    let network = state
        .db
        .update_network(id, params)
        .await
        .map_err(internal_error)?;

    json_response(network)
}

/// Delete network
pub async fn delete_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_network(id).await.map_err(internal_error)?;
    Ok(StatusCode::NO_CONTENT)
}

// --- Network IPs ---

/// List IPs in a network
pub async fn list_network_ips(
    State(state): State<AppState>,
    Path(network_id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let ips = state
        .db
        .list_network_ips(network_id)
        .await
        .map_err(internal_error)?;
    json_response(ips)
}

/// Create IP reservation
pub async fn create_network_ip(
    State(state): State<AppState>,
    Path(network_id): Path<Uuid>,
    Json(payload): Json<CreateNetworkIpPayload>,
) -> AppResult<impl IntoResponse> {
    let ip_address = std::net::IpAddr::from_str(&payload.ip_address).map_err(|_| {
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
        Some("DHCP") => IpStatus::Dhcp,
        _ => IpStatus::Active,
    };

    let params = CreateIpParams {
        network_id,
        device_id: None,
        interface_id: None,
        ip_address,
        mac_address,
        is_static: payload.is_static,
        status,
        description: payload.description,
    };

    let ip = state.db.create_ip(params).await.map_err(internal_error)?;
    json_response(ip)
}
