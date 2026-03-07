use crate::validation;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateDevicePayload {
    pub hostname: String,
    pub device_type: String,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub parent_device_id: Option<Uuid>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub mac_address: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub ip_address: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub owner: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub os_info: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub cpu_cores: Option<i16>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub ram_gb: Option<f32>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub storage_gb: Option<f32>,
}

pub type UpdateDevicePayload = CreateDevicePayload;

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateNetworkPayload {
    pub name: String,
    pub cidr: String,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub vlan_id: Option<i32>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub gateway: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub dns_servers: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub description: Option<String>,
}

pub type UpdateNetworkPayload = CreateNetworkPayload;

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateServicePayload {
    pub name: String,
    pub base_url: String,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub device_id: Option<Uuid>,
    #[serde(default)]
    pub is_public: bool,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub icon_url: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateUserPayload {
    pub username: String,
    pub email: String,
    pub role: String,
    pub password: Option<String>,
    pub is_active: bool,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct UpdateUserPayload {
    pub username: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub password: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct AssignIpPayload {
    pub network_id: Uuid,
    pub ip_address: String,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub mac_address: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_checkbox")]
    pub is_static: bool,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub status: Option<String>, // 'ACTIVE' by default
}

#[derive(Deserialize, Serialize, Clone)]
pub struct UpdateIpPayload {
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub ip_address: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub mac_address: Option<String>,
    #[serde(default)]
    pub is_static: Option<bool>,
    // allow parsing via custom option wrapper for checkbox
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub status: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub description: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct CreateNetworkIpPayload {
    pub ip_address: String,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub mac_address: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_checkbox")]
    pub is_static: bool,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub status: Option<String>,
    #[serde(default, deserialize_with = "validation::deserialize_optional_string")]
    pub description: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateInterfacePayload {
    pub name: String,
    #[serde(deserialize_with = "validation::deserialize_optional_string")]
    pub mac_address: Option<String>,
    pub interface_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_device_payload_minimal() {
        let json = r#"{"hostname":"server1","device_type":"PHYSICAL"}"#;
        let payload: CreateDevicePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.hostname, "server1");
        assert_eq!(payload.device_type, "PHYSICAL");
        assert!(payload.parent_device_id.is_none());
        assert!(payload.mac_address.is_none());
        assert!(payload.cpu_cores.is_none());
    }

    #[test]
    fn create_device_payload_empty_strings_become_none() {
        let json = r#"{"hostname":"server1","device_type":"VM","mac_address":"","ip_address":"","os_info":"","cpu_cores":"","ram_gb":"","storage_gb":""}"#;
        let payload: CreateDevicePayload = serde_json::from_str(json).unwrap();
        assert!(payload.mac_address.is_none());
        assert!(payload.ip_address.is_none());
        assert!(payload.os_info.is_none());
        assert!(payload.cpu_cores.is_none());
        assert!(payload.ram_gb.is_none());
        assert!(payload.storage_gb.is_none());
    }

    #[test]
    fn assign_ip_checkbox_parsing() {
        // "on" = true
        let json = r#"{"network_id":"00000000-0000-0000-0000-000000000001","ip_address":"10.0.0.1","is_static":"on"}"#;
        let payload: AssignIpPayload = serde_json::from_str(json).unwrap();
        assert!(payload.is_static);

        // "true" = true
        let json = r#"{"network_id":"00000000-0000-0000-0000-000000000001","ip_address":"10.0.0.1","is_static":"true"}"#;
        let payload: AssignIpPayload = serde_json::from_str(json).unwrap();
        assert!(payload.is_static);

        // "false" = false
        let json = r#"{"network_id":"00000000-0000-0000-0000-000000000001","ip_address":"10.0.0.1","is_static":"false"}"#;
        let payload: AssignIpPayload = serde_json::from_str(json).unwrap();
        assert!(!payload.is_static);
    }

    #[test]
    fn create_network_payload_full() {
        let json = r#"{"name":"LAN","cidr":"10.0.0.0/24","vlan_id":"100","gateway":"10.0.0.1","description":"Main LAN"}"#;
        let payload: CreateNetworkPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.name, "LAN");
        assert_eq!(payload.cidr, "10.0.0.0/24");
        assert_eq!(payload.vlan_id, Some(100));
        assert_eq!(payload.gateway, Some("10.0.0.1".to_string()));
        assert_eq!(payload.description, Some("Main LAN".to_string()));
    }

    #[test]
    fn create_service_payload_defaults() {
        let json = r#"{"name":"Plex","base_url":"http://10.0.0.5:32400"}"#;
        let payload: CreateServicePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.name, "Plex");
        assert!(!payload.is_public);
        assert!(payload.device_id.is_none());
    }

    #[test]
    fn create_interface_payload_empty_mac() {
        let json = r#"{"name":"eth0","mac_address":"","interface_type":"PHYSICAL"}"#;
        let payload: CreateInterfacePayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.name, "eth0");
        assert!(payload.mac_address.is_none());
        assert_eq!(payload.interface_type, "PHYSICAL");
    }
}
