use crate::AppState;
use crate::db::{CreateIpParams, CreateNetworkParams};
use crate::models::{CreateNetworkIpPayload, CreateNetworkPayload, IpStatus};
use crate::ui::{DetailProperty, DetailSection, FormSchema, TableView};
use axum::Form;
use axum::extract::{Path, State};
use axum::response::{IntoResponse, Redirect};
use sqlx::types::ipnetwork::IpNetwork;
use std::str::FromStr;
use uuid::Uuid;

use super::common::{
    AppResult, GenericDetailTemplate, GenericFormTemplate, GenericListTemplate, HtmlTemplate,
    NavLink, internal_error,
};

/// List all networks
pub async fn list_networks(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let networks = state.db.list_networks().await.map_err(internal_error)?;
    let table = TableView::from_display(networks);

    Ok(HtmlTemplate(GenericListTemplate {
        title: "Networks".to_string(),
        nav_links: NavLink::main_nav("networks", "ADMIN"),
        add_link: Some("/networks/new".to_string()),
        add_button_label: "Add Network".to_string(),
        table,
        empty_message: "No networks defined. Add one to get started.".to_string(),
        search_query: None,
        search_action: None,
    }))
}

/// Show the form to add a new network
pub async fn show_add_network_form() -> AppResult<impl IntoResponse> {
    Ok(HtmlTemplate(GenericFormTemplate {
        title: CreateNetworkPayload::form_title(),
        action: CreateNetworkPayload::form_action(),
        fields: CreateNetworkPayload::form_fields(),
        back_link: "/networks".to_string(),
        error: None,
    }))
}
/// Handle the submission of the new network form
pub async fn create_network(
    State(state): State<AppState>,
    Form(payload): Form<CreateNetworkPayload>,
) -> AppResult<impl IntoResponse> {
    // Basic validation
    let cidr = match IpNetwork::from_str(&payload.cidr) {
        Ok(c) => c,
        Err(_) => return Ok(Redirect::to("/networks/new").into_response()),
    };

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

    state
        .db
        .create_network(params)
        .await
        .map_err(internal_error)?;

    Ok(Redirect::to("/networks").into_response())
}

/// Show the form to add a new IP to a network
pub async fn show_add_network_ip_form(
    Path(network_id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    Ok(HtmlTemplate(GenericFormTemplate {
        title: CreateNetworkIpPayload::form_title(),
        action: format!("/networks/{}/ips", network_id),
        fields: CreateNetworkIpPayload::form_fields(),
        back_link: format!("/networks/{}", network_id),
        error: None,
    }))
}

/// Handle the submission of the new network IP form
pub async fn create_network_ip(
    State(state): State<AppState>,
    Path(network_id): Path<Uuid>,
    Form(payload): Form<CreateNetworkIpPayload>,
) -> AppResult<impl IntoResponse> {
    let ip_address = match std::net::IpAddr::from_str(&payload.ip_address) {
        Ok(ip) => ip,
        Err(_) => {
            return Ok(Redirect::to(&format!("/networks/{}/ips/new", network_id)).into_response());
        }
    };

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
        ip_address,
        mac_address,
        is_static: payload.is_static,
        status,
        description: payload.description,
    };

    if let Err(e) = state.db.create_ip(params).await {
        tracing::error!("Error creating IP: {}", e);

        return Ok(HtmlTemplate(GenericFormTemplate {
            title: CreateNetworkIpPayload::form_title(),
            action: format!("/networks/{}/ips", network_id),
            fields: CreateNetworkIpPayload::form_fields(),
            back_link: format!("/networks/{}", network_id),
            error: Some(format!("Failed to create IP: {}", e)),
        })
        .into_response());
    }

    Ok(Redirect::to(&format!("/networks/{}", network_id)).into_response())
}

/// Handle the deletion of a network
pub async fn delete_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_network(id).await.map_err(internal_error)?;
    // HTMX: return empty string to remove row
    Ok("")
}

/// Show the form to edit an existing network
pub async fn show_edit_network_form(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let network = state
        .db
        .get_network(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            "Network not found".into(),
        ))?;

    let mut fields = CreateNetworkPayload::form_fields();
    for field in &mut fields {
        match field.name.as_str() {
            "name" => field.value = Some(network.name.clone()),
            "cidr" => field.value = Some(network.cidr.to_string()),
            "vlan_id" => field.value = network.vlan_id.map(|v| v.to_string()),
            "gateway" => field.value = network.gateway.map(|v| v.to_string()),
            "dns_servers" => {
                field.value = network.dns_servers.clone().map(|v| {
                    v.iter()
                        .map(|ip| ip.to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                })
            }
            "description" => field.value = network.description.clone(),
            _ => {}
        }
    }

    Ok(HtmlTemplate(GenericFormTemplate {
        title: format!("Edit {}", network.name),
        action: format!("/networks/{}/edit", id),
        fields,
        back_link: format!("/networks/{}", id),
        error: None,
    }))
}

/// Handle the submission of the edit network form
pub async fn update_network(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Form(payload): Form<CreateNetworkPayload>,
) -> AppResult<impl IntoResponse> {
    let cidr = match payload.cidr.parse() {
        Ok(c) => c,
        Err(_) => return Ok(Redirect::to(&format!("/networks/{}/edit", id)).into_response()),
    };

    let params = crate::db::CreateNetworkParams {
        name: payload.name,
        cidr,
        vlan_id: payload.vlan_id,
        gateway: payload.gateway.and_then(|s| s.parse().ok()),
        dns_servers: payload
            .dns_servers
            .map(|s| s.split(',').filter_map(|p| p.trim().parse().ok()).collect()),
        description: payload.description,
    };

    state
        .db
        .update_network(id, params)
        .await
        .map_err(internal_error)?;

    Ok(Redirect::to(&format!("/networks/{}", id)).into_response())
}

pub async fn show_network_details(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let network = state
        .db
        .get_network(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            "Network not found".into(),
        ))?;

    let ips = state
        .db
        .list_network_ips(id)
        .await
        .map_err(internal_error)?;

    let properties = vec![
        DetailProperty {
            label: "Name".into(),
            value: network.name.clone(),
        },
        DetailProperty {
            label: "CIDR".into(),
            value: network.cidr.to_string(),
        },
        DetailProperty {
            label: "VLAN ID".into(),
            value: network.vlan_id.map(|v| v.to_string()).unwrap_or("-".into()),
        },
        DetailProperty {
            label: "Gateway".into(),
            value: network.gateway.map(|g| g.to_string()).unwrap_or("-".into()),
        },
        DetailProperty {
            label: "DNS Servers".into(),
            value: network
                .dns_servers
                .map(|list| {
                    list.iter()
                        .map(|ip| ip.to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or("-".into()),
        },
        DetailProperty {
            label: "Description".into(),
            value: network.description.clone().unwrap_or_default(),
        },
    ];

    let sections = vec![DetailSection {
        title: "IP Addresses".into(),
        table: TableView::from_display(ips),
        add_new_link: Some(format!("/networks/{}/ips/new", id)),
        add_button_label: Some("Add IP / Reservation".into()),
    }];

    Ok(HtmlTemplate(GenericDetailTemplate {
        title: format!("Network: {}", network.name),
        back_link: "/networks".into(),
        edit_link: Some(format!("/networks/{}/edit", id)),
        properties,
        sections,
    }))
}
