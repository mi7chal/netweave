use crate::db::CreateIpParams;
use crate::handlers::common::{AppError, AppResult};
use crate::models::{AssignIpPayload, IpStatus};
use crate::AppState;
use sea_orm::ConnectionTrait;
use axum::{extract::{Path, State}, http::StatusCode, Json};
use std::net::IpAddr;
use std::str::FromStr;
use uuid::Uuid;

pub async fn assign_ip(
    State(state): State<AppState>,
    Path(device_id): Path<Uuid>,
    Json(payload): Json<AssignIpPayload>,
) -> AppResult<Json<Uuid>> {
    let ip_address = IpAddr::from_str(&payload.ip_address)
        .map_err(|_| AppError::BadRequest("Invalid IP address".into()))?;

    let mac_address = payload.mac_address.as_ref()
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
        description: None,
    };

    let is_static = payload.is_static;
    let ip_str = ip_address.to_string();
    let mac_str = mac_address.map(|m| m.to_string());

    let ip = state.db.create_ip(params).await?;

    // Sync static lease to integrations
    if is_static {
        if let Some(mac) = mac_str {
            if let Ok(Some(device)) = state.db.get_device_details(device_id).await {
                let s = state.clone();
                let hostname = device.device.hostname;
                tokio::spawn(async move {
                    crate::integrations::trigger_static_lease_push(&s, &mac, &ip_str, &hostname).await;
                });
            }
        }
    }

    Ok(Json(ip))
}

pub async fn delete_ip_assignment(
    State(state): State<AppState>,
    Path((_device_id, ip_id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    state.db.delete_ip(ip_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_ip(
    State(state): State<AppState>,
    Path((device_id, ip_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<crate::models::UpdateIpPayload>,
) -> AppResult<Json<crate::entities::ip_addresses::Model>> {
    let ip_address = payload.ip_address.as_ref()
        .map(|s| IpAddr::from_str(s))
        .transpose()
        .map_err(|_| AppError::BadRequest("Invalid IP address".into()))?;

    let mac_address = payload.mac_address.as_ref().map(|m| {
        if m.is_empty() { None } else { mac_address::MacAddress::from_str(m).ok() }
    });

    let status = payload.status.as_deref().map(|s| match s {
        "RESERVED" => IpStatus::Reserved,
        "DHCP" => IpStatus::Dhcp,
        _ => IpStatus::Active,
    });

    // Fetch existing for integration sync comparison
    let existing_ip = state.db.list_device_ips(device_id).await
        .unwrap_or_default()
        .into_iter()
        .find(|ip| ip.id == ip_id);

    // Conflict check
    if let (Some(new_ip), Some(ref old_ip)) = (&ip_address, &existing_ip) {
        if new_ip.to_string() != old_ip.ip_address.to_string() {
            if old_ip.network_cidr.is_some() {
                let ip_net = sea_orm::prelude::IpNetwork::new(*new_ip, if new_ip.is_ipv4() { 32 } else { 128 }).unwrap();
                let stmt = sea_orm::Statement::from_sql_and_values(
                    sea_orm::DatabaseBackend::Postgres,
                    "SELECT COUNT(*) FROM ip_addresses WHERE network_id = (SELECT id FROM networks WHERE cidr >>= $1::inet LIMIT 1) AND ip_address = $1 AND id != $2",
                    vec![ip_net.into(), ip_id.into()],
                );
                if let Ok(Some(row)) = state.db.conn.query_one(stmt).await {
                    let count: i64 = row.try_get_by_index(0).unwrap_or(0);
                    if count > 0 {
                        return Err(AppError::BadRequest(format!("IP address {} is already assigned", new_ip)));
                    }
                }
            }
        }
    }

    let params = crate::db::UpdateIpParams {
        ip_id,
        ip_address: ip_address.clone(),
        mac_address,
        is_static: payload.is_static,
        status,
        description: payload.description.clone().map(Some),
    };

    let updated = state.db.update_ip(params).await?;

    // Handle integration sync for static lease transitions
    if let Some(old_ip) = existing_ip {
        let new_is_static = payload.is_static.unwrap_or(old_ip.is_static.unwrap_or(false));
        let target_ip = ip_address.map(|ip| ip.to_string()).unwrap_or(old_ip.ip_address.to_string());
        let old_mac = old_ip.mac_address.map(|m| m.to_string());
        let target_mac = match &payload.mac_address {
            Some(m) => if m.is_empty() { None } else { Some(m.clone()) },
            None => old_mac.clone(),
        };

        if let Some(mac) = target_mac.as_ref().or(old_mac.as_ref()) {
            if let Ok(Some(device)) = state.db.get_device_details(device_id).await {
                let s = state.clone();
                let hostname = device.device.hostname;
                let mac = mac.clone();
                let old_was_static = old_ip.is_static.unwrap_or(false);
                let old_mac_c = old_mac.clone();
                let old_ip_str = old_ip.ip_address.to_string();
                let target_ip_c = target_ip.clone();
                let hostname_c = hostname.clone();

                tokio::spawn(async move {
                    if new_is_static && !old_was_static {
                        crate::integrations::trigger_static_lease_push(&s, &mac, &target_ip_c, &hostname_c).await;
                    } else if !new_is_static && old_was_static {
                        crate::integrations::trigger_static_lease_delete(&s, &mac, &target_ip_c, &hostname_c).await;
                    } else if new_is_static && old_was_static {
                        if let Some(ref om) = old_mac_c {
                            if *om != mac || old_ip_str != target_ip_c {
                                crate::integrations::trigger_static_lease_delete(&s, om, &old_ip_str, &hostname_c).await;
                            }
                        }
                        crate::integrations::trigger_static_lease_push(&s, &mac, &target_ip_c, &hostname_c).await;
                    }
                });
            }
        }
    }

    Ok(Json(updated))
}
