use crate::db::CreateIpParams;
use crate::handlers::common::{internal_error, json_response, AppResult};
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
        crate::handlers::common::AppError::BadRequest("Invalid IP address".into())
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

    let is_static_assignment = payload.is_static;
    let ip_string = ip_address.to_string();
    let mac_string = mac_address.map(|m| m.to_string());
    
    let ip = state.db.create_ip(params).await.map_err(internal_error)?;

    if is_static_assignment {
        if let Some(mac) = mac_string {
            // Get hostname for the integration
            if let Ok(Some(device)) = state.db.get_device_details(device_id).await {
                let state_clone = state.clone();
                let hostname = device.device.hostname;
                tokio::spawn(async move {
                    crate::integrations::trigger_static_lease_push(&state_clone, &mac, &ip_string, &hostname).await;
                });
            }
        }
    }

    json_response(ip)
}

pub async fn delete_ip_assignment(
    State(state): State<AppState>,
    Path((_device_id, ip_id)): Path<(Uuid, Uuid)>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_ip(ip_id).await.map_err(internal_error)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_ip(
    State(state): State<AppState>,
    Path((device_id, ip_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<crate::models::UpdateIpPayload>,
) -> AppResult<impl IntoResponse> {
    // 1. Validate fields if present
    let ip_address = match &payload.ip_address {
        Some(ip_str) => Some(IpAddr::from_str(ip_str).map_err(|_| {
            crate::handlers::common::AppError::BadRequest("Invalid IP address".into())
        })?),
        None => None,
    };

    let mac_address = payload.mac_address.as_ref().map(|m| {
        if m.is_empty() {
            None
        } else {
            mac_address::MacAddress::from_str(m).ok()
        }
    });

    let status = payload.status.as_deref().map(|s| match s {
        "RESERVED" => IpStatus::Reserved,
        "DHCP" => IpStatus::Dhcp,
        _ => IpStatus::Active,
    });

    // 2. Fetch the existing IP to compare state before update
    let existing_ip = state.db.list_device_ips(device_id).await
        .unwrap_or_default()
        .into_iter()
        .find(|ip| ip.id == ip_id);

    let params = crate::db::UpdateIpParams {
        ip_id,
        ip_address: ip_address.clone(),
        mac_address,
        is_static: payload.is_static,
        status,
        description: payload.description.clone().map(Some),
    };

    // 3. Update the IP in DB
    let updated_ip = state.db.update_ip(params).await.map_err(internal_error)?;

    // 4. Handle integrations sync based on is_static transitions
    if let Some(old_ip) = existing_ip {
        let new_is_static = payload.is_static.unwrap_or(old_ip.is_static.unwrap_or(false));
        
        let target_ip_str = ip_address.map(|ip| ip.to_string()).unwrap_or(old_ip.ip_address.to_string());
        
        let existing_mac_str = old_ip.mac_address.map(|m| m.to_string());
        
        // Use MAC from payload if provided (even if clearing it), otherwise fall back to old MAC
        let target_mac_str = match &payload.mac_address {
            Some(m) => if m.is_empty() { None } else { Some(m.clone()) },
            None => existing_mac_str.clone(),
        };

        if let Some(mac_str) = target_mac_str.as_ref().or(existing_mac_str.as_ref()) {
            if let Ok(Some(device)) = state.db.get_device_details(device_id).await {
                let state_clone = state.clone();
                let hostname = device.device.hostname;
                let mac_str_clone = mac_str.clone();

                if new_is_static && !old_ip.is_static.unwrap_or(false) {
                    // Transitioning to static
                    tokio::spawn(async move {
                        crate::integrations::trigger_static_lease_push(&state_clone, &mac_str_clone, &target_ip_str, &hostname).await;
                    });
                } else if !new_is_static && old_ip.is_static.unwrap_or(false) {
                    // Transitioning to dynamic
                    tokio::spawn(async move {
                        crate::integrations::trigger_static_lease_delete(&state_clone, &mac_str_clone, &target_ip_str, &hostname).await;
                    });
                } else if new_is_static && old_ip.is_static.unwrap_or(false) {
                    // Updating an already static lease (MAC, IP, or Name could have changed). 
                    // Delete old mapping if IP or MAC changed.
                    let target_ip_str_clone = target_ip_str.clone();
                    let hostname_clone = hostname.clone();
                    let existing_mac_str_clone = existing_mac_str.clone();
                    let old_ip_address_clone = old_ip.ip_address.to_string();
                    tokio::spawn(async move {
                        // If MAC or IP actually changed, release old first
                        if let Some(old_mac) = existing_mac_str_clone {
                             if old_mac != mac_str_clone || old_ip_address_clone != target_ip_str_clone {
                                crate::integrations::trigger_static_lease_delete(&state_clone, &old_mac, &old_ip_address_clone, &hostname_clone).await;
                             }
                        }
                        crate::integrations::trigger_static_lease_push(&state_clone, &mac_str_clone, &target_ip_str_clone, &hostname_clone).await;
                    });
                }
            }
        }
    }

    json_response(updated_ip)
}
