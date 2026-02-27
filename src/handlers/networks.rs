use crate::db::{CreateIpParams, CreateNetworkParams};
use crate::handlers::common::{AppError, AppResult};
use crate::models::{CreateNetworkIpPayload, CreateNetworkPayload, IpStatus, Network, NetworkIpView, UpdateNetworkPayload};
use crate::AppState;
use axum::{extract::{Path, State}, http::StatusCode, Json};
use sqlx::types::ipnetwork::IpNetwork;
use std::str::FromStr;
use uuid::Uuid;

pub async fn list_networks(State(state): State<AppState>) -> AppResult<Json<Vec<Network>>> {
    Ok(Json(state.db.list_networks().await?))
}

pub async fn create_network(
    State(state): State<AppState>,
    Json(payload): Json<CreateNetworkPayload>,
) -> AppResult<Json<Uuid>> {
    let cidr = IpNetwork::from_str(&payload.cidr)
        .map_err(|e| AppError::BadRequest(format!("Invalid CIDR: {e}")))?;

    let params = CreateNetworkParams {
        name: payload.name,
        cidr,
        vlan_id: payload.vlan_id,
        gateway: payload.gateway.as_deref().and_then(|g| g.parse().ok()),
        dns_servers: payload.dns_servers.as_ref().map(|s| {
            s.split(',').filter_map(|ip| ip.trim().parse().ok()).collect()
        }),
        description: payload.description,
    };

    Ok(Json(state.db.create_network(params).await?))
}

pub async fn get_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Network>> {
    let network = state.db.get_network(id).await?
        .ok_or(AppError::NotFound("Network not found".into()))?;
    Ok(Json(network))
}

pub async fn update_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateNetworkPayload>,
) -> AppResult<Json<bool>> {
    let cidr = IpNetwork::from_str(&payload.cidr)
        .map_err(|e| AppError::BadRequest(format!("Invalid CIDR: {e}")))?;

    let params = CreateNetworkParams {
        name: payload.name,
        cidr,
        vlan_id: payload.vlan_id,
        gateway: payload.gateway.and_then(|s| s.parse().ok()),
        dns_servers: payload.dns_servers.map(|s| {
            s.split(',').filter_map(|p| p.trim().parse().ok()).collect()
        }),
        description: payload.description,
    };

    Ok(Json(state.db.update_network(id, params).await?))
}

pub async fn delete_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    state.db.delete_network(id).await?;
    Ok(StatusCode::NO_CONTENT)
}

// --- Network IPs ---

pub async fn list_network_ips(
    State(state): State<AppState>,
    Path(network_id): Path<Uuid>,
) -> AppResult<Json<Vec<NetworkIpView>>> {
    Ok(Json(state.db.list_network_ips(network_id).await?))
}

pub async fn create_network_ip(
    State(state): State<AppState>,
    Path(network_id): Path<Uuid>,
    Json(payload): Json<CreateNetworkIpPayload>,
) -> AppResult<Json<Uuid>> {
    let ip_address = std::net::IpAddr::from_str(&payload.ip_address)
        .map_err(|_| AppError::BadRequest("Invalid IP address".into()))?;

    let mac_address = payload.mac_address.as_ref()
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

    Ok(Json(state.db.create_ip(params).await?))
}
