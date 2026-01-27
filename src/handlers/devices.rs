use crate::AppState;
use crate::models::{CreateDevicePayload, CreateInterfacePayload, Interface};
use crate::ui::{CellType, DetailProperty, DetailSection, FormSchema, TableDisplay, TableView};
use axum::{
    Form,
    extract::{Path, Query, State},
    response::{IntoResponse, Redirect},
};
use uuid::Uuid;

use super::common::{
    AppResult, GenericDetailTemplate, GenericFormTemplate, GenericListTemplate, HtmlTemplate,
    NavLink, internal_error,
};

#[derive(serde::Deserialize)]
pub struct SearchParams {
    q: Option<String>,
}

pub async fn list_devices(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> AppResult<impl IntoResponse> {
    let devices = state
        .db
        .list_devices(params.q.clone())
        .await
        .map_err(internal_error)?;
    let table = TableView::from_display(devices);

    Ok(HtmlTemplate(GenericListTemplate {
        title: "Devices".into(),
        nav_links: NavLink::main_nav("devices", "ADMIN"),
        add_link: Some("/devices/new".into()),
        add_button_label: "Add Device".into(),
        table,
        empty_message: "No devices found. Add your first device!".into(),
        search_query: params.q,
        search_action: Some("/devices".into()),
    }))
}

pub async fn show_add_device_form(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let devices = state.db.list_devices(None).await.map_err(internal_error)?;
    let device_options = devices
        .into_iter()
        .map(|d| (d.id.to_string(), d.hostname))
        .collect();

    let mut fields = CreateDevicePayload::form_fields();
    if let Some(field) = fields.iter_mut().find(|f| f.name == "parent_device_id") {
        *field = crate::ui::FormField::select("parent_device_id", "Parent Device", device_options);
    }

    Ok(HtmlTemplate(GenericFormTemplate {
        title: CreateDevicePayload::form_title(),
        action: CreateDevicePayload::form_action(),
        fields,
        back_link: "/devices".into(),
        error: None,
    }))
}

pub async fn create_device(
    State(state): State<AppState>,
    Form(payload): Form<CreateDevicePayload>,
) -> AppResult<impl IntoResponse> {
    state
        .db
        .create_device(payload)
        .await
        .map_err(internal_error)?;
    Ok(Redirect::to("/devices"))
}

pub async fn delete_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_device(id).await.map_err(internal_error)?;
    // HTMX: return empty string to remove row from DOM
    Ok("")
}

pub async fn show_edit_device_form(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let device = state
        .db
        .get_device(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            "Device not found".to_string(),
        ))?;

    let devices = state.db.list_devices(None).await.map_err(internal_error)?;
    let device_options = devices
        .into_iter()
        .filter(|d| d.id != id)
        .map(|d| (d.id.to_string(), d.hostname))
        .collect::<Vec<_>>();

    // Get eth0 mac
    let interfaces = state.db.list_interfaces(id).await.map_err(internal_error)?;
    let eth0_mac = interfaces
        .iter()
        .find(|i| i.name == "eth0")
        .and_then(|i| i.mac_address.map(|m| m.to_string()));

    let mut fields = CreateDevicePayload::form_fields();
    for field in &mut fields {
        match field.name.as_str() {
            "hostname" => field.value = Some(device.hostname.clone()),
            "device_type" => {
                for opt in &mut field.options {
                    if opt
                        .value
                        .eq_ignore_ascii_case(&device.device_type.to_string())
                    {
                        opt.selected = true;
                    }
                }
                if field.options.is_empty() {
                    field.value = Some(device.device_type.to_string());
                }
            }
            "parent_device_id" => {
                *field = crate::ui::FormField::select(
                    "parent_device_id",
                    "Parent Device",
                    device_options.clone(),
                );
                if let Some(pid) = device.parent_device_id {
                    let pid_str = pid.to_string();
                    for opt in &mut field.options {
                        if opt.value == pid_str {
                            opt.selected = true;
                        }
                    }
                }
            }
            "mac_address" => field.value = eth0_mac.clone(),
            "os_info" => field.value = device.os_info.clone(),
            "cpu_cores" => field.value = device.cpu_cores.map(|v| v.to_string()),
            "ram_gb" => field.value = device.ram_gb.map(|v| v.to_string()),
            "storage_gb" => field.value = device.storage_gb.map(|v| v.to_string()),
            _ => {}
        }
    }

    Ok(HtmlTemplate(GenericFormTemplate {
        title: format!("Edit {}", device.hostname),
        action: format!("/devices/{}/edit", id),
        fields,
        back_link: format!("/devices/{}", id),
        error: None,
    }))
}

pub async fn update_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Form(payload): Form<CreateDevicePayload>,
) -> AppResult<impl IntoResponse> {
    state
        .db
        .update_device(id, payload)
        .await
        .map_err(internal_error)?;
    Ok(Redirect::to(&format!("/devices/{}", id)))
}

pub async fn show_add_interface_form(
    State(_state): State<AppState>,
    Path(device_id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    Ok(HtmlTemplate(GenericFormTemplate {
        title: CreateInterfacePayload::form_title(),
        action: format!("/devices/{}/interfaces", device_id),
        fields: CreateInterfacePayload::form_fields(),
        back_link: format!("/devices/{}", device_id),
        error: None,
    }))
}

pub async fn create_interface(
    State(state): State<AppState>,
    Path(device_id): Path<Uuid>,
    Form(payload): Form<CreateInterfacePayload>,
) -> AppResult<impl IntoResponse> {
    state
        .db
        .create_interface(device_id, payload)
        .await
        .map_err(internal_error)?;
    Ok(Redirect::to(&format!("/devices/{}", device_id)))
}

pub async fn delete_interface(
    State(state): State<AppState>,
    Path((device_id, interface_id)): Path<(Uuid, Uuid)>,
) -> AppResult<impl IntoResponse> {
    state
        .db
        .delete_interface(interface_id)
        .await
        .map_err(internal_error)?;
    Ok(Redirect::to(&format!("/devices/{}", device_id)))
}

pub async fn show_device_details(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let device = state
        .db
        .get_device(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            "Device not found".to_string(),
        ))?;

    let ips = state.db.list_device_ips(id).await.map_err(internal_error)?;
    let interfaces = state.db.list_interfaces(id).await.map_err(internal_error)?;

    let mut properties = vec![
        DetailProperty {
            label: "Hostname".into(),
            value: device.hostname.clone(),
        },
        DetailProperty {
            label: "Type".into(),
            value: device.device_type.to_string(),
        },
        DetailProperty {
            label: "OS / Firmware".into(),
            value: device.os_info.clone().unwrap_or("-".into()),
        },
    ];

    if let (Some(cpu), Some(ram)) = (device.cpu_cores, device.ram_gb) {
        properties.push(DetailProperty {
            label: "Resources".into(),
            value: format!("{} vCPU / {} GB RAM", cpu, ram),
        });
    }

    if let Some(storage) = device.storage_gb {
        properties.push(DetailProperty {
            label: "Storage".into(),
            value: format!("{} GB", storage),
        });
    }

    properties.push(DetailProperty {
        label: "Created At".into(),
        value: device.created_at.format("%Y-%m-%d %H:%M").to_string(),
    });

    let mut interface_rows = vec![];
    for iface in &interfaces {
        let mut row = iface.table_row();
        row.cells.push(CellType::Actions {
            delete_url: format!("/devices/{}/interfaces/{}", id, iface.id),
        });
        interface_rows.push(row);
    }
    let mut interface_headers = Interface::table_headers();
    interface_headers.push("".into());

    let sections = vec![
        DetailSection {
            title: "Interfaces".into(),
            table: TableView {
                headers: interface_headers,
                rows: interface_rows,
            },
            add_new_link: Some(format!("/devices/{}/interfaces/new", id)),
            add_button_label: Some("Add Interface".into()),
        },
        DetailSection {
            title: "IP Assignments".into(),
            // DeviceIpView now includes the Status column
            table: TableView::from_display(ips),
            add_new_link: Some(format!("/devices/{}/ips/new", id)),
            add_button_label: Some("Assign IP".into()),
        },
    ];

    Ok(HtmlTemplate(GenericDetailTemplate {
        title: format!("Device: {}", device.hostname),
        back_link: "/devices".into(),
        edit_link: Some(format!("/devices/{}/edit", id)),
        properties,
        sections,
    }))
}
