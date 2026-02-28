//! IP assignment and update sync with integrations (static lease push/delete).

use crate::models::{DeviceIpView, UpdateIpPayload};
use crate::AppState;
use uuid::Uuid;

/// Syncs static lease to integrations after a new IP assignment (assign_ip handler).
pub async fn sync_after_assign_ip(
    state: &AppState,
    _device_id: Uuid,
    ip_str: &str,
    mac: &str,
    hostname: &str,
) {
    let s = state.clone();
    let mac = mac.to_string();
    let ip_str = ip_str.to_string();
    let hostname = hostname.to_string();
    tokio::spawn(async move {
        crate::integrations::trigger_static_lease_push(&s, &mac, &ip_str, &hostname).await;
    });
}

/// Syncs static lease transitions to integrations after an IP update (update_ip handler).
pub async fn sync_after_update_ip(
    state: &AppState,
    device_id: Uuid,
    existing_ip: &DeviceIpView,
    payload: &UpdateIpPayload,
    updated_ip_address: Option<std::net::IpAddr>,
) {
    let new_is_static = payload
        .is_static
        .unwrap_or(existing_ip.is_static.unwrap_or(false));
    let target_ip = updated_ip_address
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| existing_ip.ip_address.to_string());
    let old_mac = existing_ip.mac_address.as_ref().map(|m| m.to_string());
    let target_mac = match &payload.mac_address {
        Some(m) if m.is_empty() => None,
        Some(m) => Some(m.clone()),
        None => old_mac.clone(),
    };

    let Some(mac) = target_mac.as_ref().or(old_mac.as_ref()) else {
        return;
    };

    let Ok(Some(device)) = state.db.get_device_details(device_id).await else {
        return;
    };

    let s = state.clone();
    let hostname = device.device.hostname.clone();
    let mac = mac.clone();
    let old_was_static = existing_ip.is_static.unwrap_or(false);
    let old_mac_c = old_mac.clone();
    let old_ip_str = existing_ip.ip_address.to_string();
    let target_ip_c = target_ip.clone();
    let hostname_c = hostname.clone();

    tokio::spawn(async move {
        if new_is_static && !old_was_static {
            crate::integrations::trigger_static_lease_push(&s, &mac, &target_ip_c, &hostname_c)
                .await;
        } else if !new_is_static && old_was_static {
            crate::integrations::trigger_static_lease_delete(&s, &mac, &target_ip_c, &hostname_c)
                .await;
        } else if new_is_static && old_was_static {
            if let Some(ref om) = old_mac_c {
                if *om != mac || old_ip_str != target_ip_c {
                    crate::integrations::trigger_static_lease_delete(
                        &s, om, &old_ip_str, &hostname_c,
                    )
                    .await;
                }
            }
            crate::integrations::trigger_static_lease_push(&s, &mac, &target_ip_c, &hostname_c)
                .await;
        }
    });
}
