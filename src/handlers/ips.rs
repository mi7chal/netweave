use crate::db::CreateIpParams;
use crate::db::helpers;
use crate::handlers::common::{AppError, AppResult};
use crate::models::{AssignIpPayload, IpStatus};
use crate::models::types::parse_optional_mac;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sea_orm::ConnectionTrait;
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

    let mac_address = parse_optional_mac(&payload.mac_address);

    let status = payload.status.as_deref()
        .and_then(|s| IpStatus::from_str(s).ok())
        .unwrap_or(IpStatus::Active);

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

    if is_static {
        if let Some(mac) = &mac_str {
            if let Ok(Some(device)) = state.db.get_device_details(device_id).await {
                crate::services::ip_service::sync_after_assign_ip(
                    &state,
                    device_id,
                    &ip_str,
                    mac,
                    &device.device.hostname,
                )
                .await;
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
    let ip_address = payload
        .ip_address
        .as_ref()
        .map(|s| IpAddr::from_str(s))
        .transpose()
        .map_err(|_| AppError::BadRequest("Invalid IP address".into()))?;

    let mac_address = payload.mac_address.as_ref().map(|m| {
        if m.is_empty() { None } else { mac_address::MacAddress::from_str(m).ok() }
    });

    let status = payload.status.as_deref()
        .and_then(|s| IpStatus::from_str(s).ok());

    let existing_ip = state
        .db
        .list_device_ips(device_id)
        .await
        .unwrap_or_default()
        .into_iter()
        .find(|ip| ip.id == ip_id);

    // Conflict check: ensure the new IP isn't already taken in the same network
    if let (Some(new_ip), Some(ref old_ip)) = (&ip_address, &existing_ip) {
        if new_ip.to_string() != old_ip.ip_address.to_string() && old_ip.network_cidr.is_some() {
            let ip_net = helpers::ip_to_network(*new_ip)?;
            let stmt = sea_orm::Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                "SELECT COUNT(*) FROM ip_addresses \
                 WHERE network_id = (SELECT id FROM networks WHERE cidr >>= $1::inet LIMIT 1) \
                 AND ip_address = $1 AND id != $2",
                vec![ip_net.into(), ip_id.into()],
            );
            if let Ok(Some(row)) = state.db.conn.query_one(stmt).await {
                let count: i64 = row.try_get_by_index(0).unwrap_or(0);
                if count > 0 {
                    return Err(AppError::BadRequest(format!(
                        "IP address {} is already assigned",
                        new_ip
                    )));
                }
            }
        }
    }

    let params = crate::db::UpdateIpParams {
        ip_id,
        ip_address,
        mac_address,
        is_static: payload.is_static,
        status,
        description: payload.description.clone().map(Some),
    };

    let updated = state.db.update_ip(params).await?;

    if let Some(ref old_ip) = existing_ip {
        crate::services::ip_service::sync_after_update_ip(
            &state,
            device_id,
            old_ip,
            &payload,
            ip_address,
        )
        .await;
    }

    Ok(Json(updated))
}
