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

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateDevicePayload {
    pub hostname: String,
    pub device_type: String,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub parent_device_id: Option<Uuid>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub mac_address: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub ip_address: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub owner: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub os_info: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub cpu_cores: Option<i16>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub ram_gb: Option<f32>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub storage_gb: Option<f32>,
}

pub type UpdateDevicePayload = CreateDevicePayload;

#[derive(Deserialize, Serialize, Clone)]
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

pub type UpdateNetworkPayload = CreateNetworkPayload;

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateServicePayload {
    pub name: String,
    pub base_url: String,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub device_id: Option<Uuid>,
    #[serde(default)]
    pub is_public: bool,
}

#[derive(Deserialize, Serialize, Clone)]
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

#[derive(Deserialize, Serialize, Clone)]
pub struct UpdateIpPayload {
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub ip_address: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub mac_address: Option<String>,
    #[serde(default)]
    pub is_static: Option<bool>,
    // allow parsing via custom option wrapper for checkbox
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub status: Option<String>,
    #[serde(default, deserialize_with = "deserialize_empty_str_as_none")]
    pub description: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
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

#[derive(Deserialize, Debug, Clone)]
pub struct CreateInterfacePayload {
    pub name: String,
    #[serde(deserialize_with = "deserialize_empty_str_as_none")]
    pub mac_address: Option<String>,
    pub interface_type: String,
}
