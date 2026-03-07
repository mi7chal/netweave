use crate::db::CreateIpParams;
use crate::handlers::common::{parse_ip_addr, parse_ip_status_or_default, AppError, AppResult};
use crate::models::types::parse_optional_mac;
use crate::models::{
    CreateNetworkIpPayload, CreateNetworkPayload, Network, NetworkIpView, UpdateNetworkPayload,
};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

pub async fn list_networks(State(state): State<AppState>) -> AppResult<Json<Vec<Network>>> {
    Ok(Json(state.db.list_networks().await?))
}

pub async fn create_network(
    State(state): State<AppState>,
    Json(payload): Json<CreateNetworkPayload>,
) -> AppResult<Json<Uuid>> {
    let network_id = crate::services::NetworkService::create(&state.db, payload).await?;
    Ok(Json(network_id))
}

pub async fn get_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Network>> {
    let network = state
        .db
        .get_network(id)
        .await?
        .ok_or(AppError::NotFound("Network not found".into()))?;
    Ok(Json(network))
}

pub async fn update_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateNetworkPayload>,
) -> AppResult<Json<bool>> {
    let result = crate::services::NetworkService::update(&state.db, id, payload).await?;
    Ok(Json(result))
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
    let ip_address = parse_ip_addr(&payload.ip_address)?;

    let mac_address = parse_optional_mac(&payload.mac_address);

    let status = parse_ip_status_or_default(payload.status.as_deref());

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
