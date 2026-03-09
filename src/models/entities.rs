use super::types::{DeviceType, IpStatus};
use chrono::{DateTime, Utc};
use ipnetwork::IpNetwork;
use mac_address::MacAddress;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::IpAddr;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub auth_subject_id: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Network {
    pub id: Uuid,
    pub name: String,
    pub cidr: IpNetwork,
    pub vlan_id: Option<i32>,
    pub gateway: Option<IpAddr>,
    pub dns_servers: Option<Vec<IpAddr>>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Interface {
    pub id: Uuid,
    pub device_id: Uuid,
    pub name: String,
    pub mac_address: Option<MacAddress>,
    pub interface_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub id: Uuid,
    pub device_id: Option<Uuid>,
    pub name: String,
    pub base_url: String,
    pub health_endpoint: Option<String>,
    pub monitor_interval_seconds: Option<i32>,
    pub total_checks: Option<i32>,
    pub successful_checks: Option<i32>,
    pub is_public: Option<bool>,
    pub icon_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardService {
    pub id: Uuid,
    pub name: String,
    pub base_url: String,
    pub health_endpoint: Option<String>,
    pub is_public: bool,
    pub total_checks: i32,
    pub successful_checks: i32,
    pub device_hostname: String,
    pub device_id: Option<Uuid>,
    pub icon_url: Option<String>,
}

/// Dashboard/service list item with live status and uptime (unifies dashboard and services handlers).
#[derive(Debug, Clone, Serialize)]
pub struct ServiceWithStatus {
    #[serde(flatten)]
    pub service: DashboardService,
    pub status: String,
    pub uptime_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkIpView {
    pub id: Uuid, // IpAddress ID
    pub ip_address: IpAddr,
    pub device_hostname: Option<String>,
    pub interface_name: Option<String>,
    pub mac_address: Option<MacAddress>,
    pub status: IpStatus,
    pub description: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceListView {
    pub id: Uuid,
    pub hostname: String,
    pub device_type: DeviceType,
    pub os_info: Option<String>,
    pub created_at: DateTime<Utc>,
    // Flatted fields for list view
    pub primary_ip: Option<IpAddr>,
    pub mac_address: Option<MacAddress>,
    pub is_static: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceDetails {
    #[serde(flatten)]
    pub device: Device,
    pub interfaces: Vec<InterfaceWithIps>,
    pub services: Vec<Service>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceWithIps {
    #[serde(flatten)]
    pub interface: Interface,
    pub ips: Vec<IpAddress>,
}

// ---------------------------------------------------------------------------
// From impls: SeaORM entity → API model (eliminates field-by-field mapping)
// ---------------------------------------------------------------------------

impl From<crate::entities::users::Model> for User {
    fn from(u: crate::entities::users::Model) -> Self {
        Self {
            id: u.id,
            username: u.username,
            email: u.email,
            auth_subject_id: u.auth_subject_id,
            role: u.role,
            is_active: u.is_active,
            created_at: u.created_at.into(),
        }
    }
}

impl From<crate::entities::networks::Model> for Network {
    fn from(n: crate::entities::networks::Model) -> Self {
        Self {
            id: n.id,
            name: n.name,
            cidr: n.cidr,
            vlan_id: n.vlan_id,
            gateway: n.gateway.map(|gn| gn.ip()),
            dns_servers: n.dns_servers.map(|v| v.iter().map(|ip| ip.ip()).collect()),
            description: n.description,
        }
    }
}

impl From<crate::entities::devices::Model> for Device {
    fn from(d: crate::entities::devices::Model) -> Self {
        Self {
            id: d.id,
            parent_device_id: d.parent_device_id,
            hostname: d.hostname,
            device_type: d.r#type.as_str().into(),
            cpu_cores: d.cpu_cores,
            ram_gb: d.ram_gb,
            storage_gb: d.storage_gb,
            os_info: d.os_info,
            meta_data: d.meta_data,
            created_at: d.created_at.into(),
        }
    }
}

impl From<crate::entities::services::Model> for Service {
    fn from(s: crate::entities::services::Model) -> Self {
        Self {
            id: s.id,
            device_id: s.device_id,
            name: s.name,
            base_url: s.base_url,
            health_endpoint: s.health_endpoint,
            monitor_interval_seconds: s.monitor_interval_seconds,
            total_checks: s.total_checks,
            successful_checks: s.successful_checks,
            is_public: s.is_public,
            icon_url: s.icon_url,
        }
    }
}

impl From<crate::entities::interfaces::Model> for Interface {
    fn from(i: crate::entities::interfaces::Model) -> Self {
        Self {
            id: i.id,
            device_id: i.device_id,
            name: i.name,
            mac_address: i.mac_address.map(|m| m.0),
            interface_type: i.r#type,
        }
    }
}

impl From<crate::entities::ip_addresses::Model> for IpAddress {
    fn from(ip: crate::entities::ip_addresses::Model) -> Self {
        Self {
            id: ip.id,
            network_id: ip.network_id,
            interface_id: ip.interface_id,
            ip_address: ip.ip_address.ip(),
            mac_address: ip.mac_address.map(|m| m.0),
            status: ip.status,
            description: ip.description,
            is_static: ip.is_static,
        }
    }
}
