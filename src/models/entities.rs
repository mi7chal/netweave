use super::types::{DeviceType, IpStatus};
use chrono::{DateTime, Utc};
use mac_address::MacAddress;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::types::ipnetwork::IpNetwork;
use std::net::IpAddr;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Network {
    pub id: Uuid,
    pub name: String,
    pub cidr: IpNetwork,
    pub vlan_id: Option<i32>,
    pub gateway: Option<IpAddr>,
    pub dns_servers: Option<Vec<IpAddr>>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Device {
    pub id: Uuid,
    pub parent_device_id: Option<Uuid>,
    pub hostname: String,
    pub device_type: DeviceType,
    pub cpu_cores: Option<i16>,
    pub ram_gb: Option<f32>,
    pub storage_gb: Option<f32>,
    pub os_info: Option<String>,
    pub meta_data: Option<Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Interface {
    pub id: Uuid,
    pub device_id: Uuid,
    pub name: String,
    pub mac_address: Option<MacAddress>,
    pub interface_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct IpAddress {
    pub id: Uuid,
    pub network_id: Uuid,
    pub interface_id: Option<Uuid>,
    pub ip_address: IpAddr,
    pub mac_address: Option<MacAddress>,
    pub status: IpStatus,
    pub description: Option<String>,
    pub is_static: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Service {
    pub id: Uuid,
    pub device_id: Option<Uuid>,
    pub name: String,
    pub base_url: String,
    pub health_endpoint: Option<String>,
    pub monitor_interval_seconds: Option<i32>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DashboardService {
    pub id: Uuid,
    pub name: String,
    pub base_url: String,
    pub is_public: bool,
    pub device_hostname: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DeviceIpView {
    pub id: Uuid, // Interface ID
    pub device_id: Uuid,
    pub interface_name: String,
    pub ip_address: IpAddr,
    pub mac_address: Option<MacAddress>,
    pub is_static: Option<bool>,
    pub status: Option<IpStatus>,
    pub network_name: Option<String>,
    pub network_cidr: Option<IpNetwork>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct NetworkIpView {
    pub id: Uuid, // IpAddress ID
    pub ip_address: IpAddr,
    pub device_hostname: Option<String>,
    pub interface_name: Option<String>,
    pub mac_address: Option<MacAddress>,
    pub status: IpStatus,
    pub description: Option<String>,
}
