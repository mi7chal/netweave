use crate::ui::{FormField, FormSchema};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

fn deserialize_checkbox<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    match s.as_str() {
        "on" | "true" | "1" => Ok(true),
        _ => Ok(false),
    }
}

fn deserialize_empty_str_as_none<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    match s {
        Some(s) if !s.is_empty() => T::from_str(&s).map(Some).map_err(serde::de::Error::custom),
        _ => Ok(None),
    }
}

#[derive(Deserialize, Serialize)]
pub struct CreateDevicePayload {
    pub hostname: String,
    pub device_type: String,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub parent_device_id: Option<Uuid>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub mac_address: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub os_info: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub cpu_cores: Option<i16>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub ram_gb: Option<f32>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub storage_gb: Option<f32>,
}

impl FormSchema for CreateDevicePayload {
    fn form_title() -> String {
        "Add New Device".into()
    }
    fn form_action() -> String {
        "/devices".into()
    }
    fn form_fields() -> Vec<FormField> {
        vec![
            FormField::text("hostname", "Hostname")
                .required()
                .placeholder("e.g. web-server-01"),
            FormField::select("parent_device_id", "Parent Device", vec![]),
            FormField::select(
                "device_type",
                "Type",
                vec![
                    ("PHYSICAL".into(), "Physical Hardware".into()),
                    ("VM".into(), "Virtual Machine".into()),
                    ("LXC".into(), "LXC Container".into()),
                    ("CONTAINER".into(), "Docker Container".into()),
                    ("SWITCH".into(), "Network Switch".into()),
                    ("AP".into(), "Access Point".into()),
                    ("ROUTER".into(), "Router".into()),
                    ("OTHER".into(), "Other".into()),
                ],
            )
            .required(),
            FormField::text("os_info", "OS / Firmware").placeholder("e.g. Ubuntu 22.04"),
            FormField::text("mac_address", "MAC Address (Auto-link)")
                .placeholder("e.g. 00:11:22:33:44:55"),
            FormField::number("cpu_cores", "CPU Cores").placeholder("e.g. 4"),
            FormField::number("ram_gb", "RAM (GB)").placeholder("e.g. 16"),
            FormField::number("storage_gb", "Storage (GB)").placeholder("e.g. 512"),
        ]
    }
}

#[derive(Deserialize, Serialize)]
pub struct CreateNetworkPayload {
    pub name: String,
    pub cidr: String,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub vlan_id: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub gateway: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub dns_servers: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub description: Option<String>,
}

impl FormSchema for CreateNetworkPayload {
    fn form_title() -> String {
        "Add New Network".into()
    }
    fn form_action() -> String {
        "/networks".into()
    }
    fn form_fields() -> Vec<FormField> {
        vec![
            FormField::text("name", "Network Name")
                .required()
                .placeholder("e.g. IoT LAN"),
            FormField::text("cidr", "CIDR")
                .required()
                .placeholder("e.g. 192.168.10.0/24"),
            FormField::number("vlan_id", "VLAN ID").placeholder("1-4096"),
            FormField::text("gateway", "Gateway IP").placeholder("e.g. 192.168.10.1"),
            FormField::text("dns_servers", "DNS Servers").placeholder("e.g. 1.1.1.1, 8.8.8.8"),
            FormField::text("description", "Description").placeholder("Optional notes"),
        ]
    }
}

#[derive(Deserialize, Serialize)]
pub struct CreateServicePayload {
    pub name: String,
    pub base_url: String,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub device_id: Option<Uuid>,
    #[serde(default, deserialize_with = "deserialize_checkbox")]
    pub is_public: bool,
}

impl FormSchema for CreateServicePayload {
    fn form_title() -> String {
        "Add New Service".into()
    }
    fn form_action() -> String {
        "/services".into()
    }
    fn form_fields() -> Vec<FormField> {
        vec![
            FormField::text("name", "Service Name")
                .required()
                .placeholder("e.g. Plex Media Server"),
            FormField::text("base_url", "Base URL")
                .required()
                .placeholder("http://192.168.1.100:32400"),
            // Helper for dynamic selection - handler must populate options
            FormField::select("device_id", "Host Device", vec![]),
            FormField::checkbox("is_public", "Publicly Accessible"),
        ]
    }
}

#[derive(Deserialize, Serialize)]
pub struct AssignIpPayload {
    pub network_id: Uuid,
    pub ip_address: String,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub mac_address: Option<String>,
    #[serde(default, deserialize_with = "deserialize_checkbox")]
    pub is_static: bool,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub status: Option<String>, // 'ACTIVE' by default
}

impl FormSchema for AssignIpPayload {
    fn form_title() -> String {
        "Assign IP Address".into()
    }
    fn form_action() -> String {
        // Placeholder, must be replaced by handler logic
        "/devices/{id}/ips".into()
    }
    fn form_fields() -> Vec<FormField> {
        vec![
            FormField::select("network_id", "Network", vec![]).required(),
            FormField::text("ip_address", "IP Address")
                .required()
                .placeholder("e.g. 192.168.1.50"),
            FormField::select(
                "status",
                "Status",
                vec![
                    ("ACTIVE".into(), "Active".into()),
                    ("RESERVED".into(), "Reserved".into()),
                ],
            )
            .required(),
            FormField::text("mac_address", "MAC Address").placeholder("e.g. 00:11:22:33:44:55"),
            FormField::checkbox("is_static", "Static Allocation").checked(true),
        ]
    }
}

#[derive(Deserialize, Serialize)]
pub struct CreateNetworkIpPayload {
    pub ip_address: String,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub mac_address: Option<String>,
    #[serde(default, deserialize_with = "deserialize_checkbox")]
    pub is_static: bool,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub status: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub description: Option<String>,
}

impl FormSchema for CreateNetworkIpPayload {
    fn form_title() -> String {
        "Add IP / Reservation".into()
    }
    fn form_action() -> String {
        "/networks/{id}/ips".into()
    }
    fn form_fields() -> Vec<FormField> {
        vec![
            FormField::text("ip_address", "IP Address")
                .required()
                .placeholder("e.g. 192.168.1.100"),
            FormField::select(
                "status",
                "Status",
                vec![
                    ("ACTIVE".into(), "Active".into()),
                    ("RESERVED".into(), "Reserved".into()),
                    ("DHCP".into(), "DHCP".into()),
                ],
            )
            .required(),
            FormField::text("description", "Description").placeholder("e.g. Reserved for VPN"),
            FormField::text("mac_address", "MAC Address").placeholder("e.g. 00:11:22:33:44:55"),
            FormField::checkbox("is_static", "Static").checked(true),
        ]
    }
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateInterfacePayload {
    pub name: String,
    #[serde(deserialize_with = "deserialize_empty_str_as_none")]
    pub mac_address: Option<String>,
    pub interface_type: String,
}

impl FormSchema for CreateInterfacePayload {
    fn form_title() -> String {
        "Add Network Interface".into()
    }

    fn form_action() -> String {
        "".into() // Overridden by handler
    }

    fn form_fields() -> Vec<FormField> {
        vec![
            FormField::text("name", "Interface Name")
                .required()
                .placeholder("e.g. eth1"),
            FormField::text("mac_address", "MAC Address").placeholder("e.g. 00:11:22:33:44:55"),
            FormField::select(
                "interface_type",
                "Type",
                vec![
                    ("PHYSICAL".into(), "Physical".into()),
                    ("VIRTUAL".into(), "Virtual".into()),
                    ("BOND".into(), "Bond".into()),
                    ("BRIDGE".into(), "Bridge".into()),
                    ("VLAN".into(), "VLAN".into()),
                ],
            ),
        ]
    }
}
