use crate::AppState;
use crate::db::CreateIpParams;
use crate::models::{AssignIpPayload, IpStatus};
use crate::ui::{FormField, FormSchema};
use axum::{
    Form,
    extract::{Path, State},
    response::{IntoResponse, Redirect},
};
use std::net::IpAddr;
use std::str::FromStr;
use uuid::Uuid;

use super::common::{AppResult, GenericFormTemplate, HtmlTemplate, internal_error};

pub async fn show_assign_ip_form(
    State(state): State<AppState>,
    Path(device_id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    // We need to fetch networks to populate the dropdown
    let networks = state.db.list_networks().await.map_err(internal_error)?;

    let network_options = networks
        .into_iter()
        .map(|n| (n.id.to_string(), format!("{} ({})", n.name, n.cidr)))
        .collect();

    // Get default fields and inject options
    let mut fields = AssignIpPayload::form_fields();

    if let Some(field) = fields.iter_mut().find(|f| f.name == "network_id") {
        *field = FormField::select("network_id", "Network", network_options).required();
    }

    Ok(HtmlTemplate(GenericFormTemplate {
        title: AssignIpPayload::form_title(),
        // We override the default action to include the specific device ID
        action: format!("/devices/{}/ips", device_id),
        fields,
        back_link: format!("/devices/{}", device_id),
        error: None,
    }))
}

pub async fn assign_ip(
    State(state): State<AppState>,
    Path(device_id): Path<Uuid>,
    Form(payload): Form<AssignIpPayload>,
) -> AppResult<impl IntoResponse> {
    // Basic validation
    let ip_address = match IpAddr::from_str(&payload.ip_address) {
        Ok(ip) => ip,
        Err(_) => return Ok(Redirect::to(&format!("/devices/{}", device_id)).into_response()),
    };

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
        ip_address,
        mac_address,
        is_static: payload.is_static,
        status,
        description: None, // Future: Add description field to AssignIpPayload
    };

    state.db.create_ip(params).await.map_err(internal_error)?;

    Ok(Redirect::to(&format!("/devices/{}", device_id)).into_response())
}

pub async fn delete_ip_assignment(
    State(state): State<AppState>,
    Path((_device_id, ip_id)): Path<(Uuid, Uuid)>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_ip(ip_id).await.map_err(internal_error)?;
    // HTMX swap: return empty string to remove row
    Ok("")
}
