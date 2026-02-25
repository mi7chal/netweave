use super::Db;
use crate::entities::{devices, interfaces, ip_addresses, services};
use crate::models::{
    CreateDevicePayload, Device, DeviceDetails, DeviceListView, DeviceType, InterfaceWithIps,
};
use sea_orm::*;
use sea_orm::{QueryOrder, QuerySelect};
use sea_orm::sea_query::{Alias, Expr};
use std::collections::HashMap;
use uuid::Uuid;

impl Db {
    pub async fn list_devices(
        &self,
        search: Option<String>,
    ) -> Result<Vec<DeviceListView>, anyhow::Error> {
        let search = search.unwrap_or_default().to_lowercase();

        let mut query = devices::Entity::find();

        if !search.is_empty() {
            let s = format!("%{}%", search);
            
            // Allow casting INET/MACADDR to text for LIKE search
            let mac_cast = Expr::col(interfaces::Column::MacAddress).cast_as(Alias::new("text"));
            let ip_cast = Expr::col(ip_addresses::Column::IpAddress).cast_as(Alias::new("text"));

            query = query
                .join(
                    sea_orm::JoinType::LeftJoin,
                    devices::Relation::Interfaces.def()
                )
                .join(
                    sea_orm::JoinType::LeftJoin,
                    ip_addresses::Relation::Interface.def().rev()
                )
                .filter(
                    Condition::any()
                        .add(devices::Column::Hostname.like(&s))
                        .add(devices::Column::Type.like(&s))
                        .add(devices::Column::OsInfo.like(&s))
                        .add(mac_cast.clone().like(&s))
                        .add(ip_cast.clone().like(&s))
                )
                // Group by to avoid duplicates since we're joining 1-to-many relationships
                .group_by(devices::Column::Id);
        }

        let devices_models = query
            .order_by_asc(devices::Column::Hostname)
            .all(&self.conn)
            .await?;

        if devices_models.is_empty() {
            return Ok(vec![]);
        }

        let device_ids: Vec<Uuid> = devices_models.iter().map(|d| d.id).collect();

        // Fetch primary interfaces (eth0)
        let interfaces_models = interfaces::Entity::find()
            .filter(interfaces::Column::DeviceId.is_in(device_ids))
            .filter(interfaces::Column::Name.eq("eth0"))
            .select_only()
            .column(interfaces::Column::Id)
            .column(interfaces::Column::DeviceId)
            .column(interfaces::Column::Name)
            .column_as(sea_orm::sea_query::Expr::col(interfaces::Column::MacAddress).cast_as(sea_orm::sea_query::Alias::new("text")), "mac_address")
            .column(interfaces::Column::Type)
            .column(interfaces::Column::CreatedAt)
            .into_model::<interfaces::Model>()
            .all(&self.conn)
            .await?;

        let interface_ids: Vec<Uuid> = interfaces_models.iter().map(|i| i.id).collect();
        // Map device_id -> Interface
        let mut device_interface_map = HashMap::new();
        for i in &interfaces_models {
            device_interface_map.insert(i.device_id, i);
        }

        // Fetch primary IPs for these interfaces
        let mut interface_ip_map = HashMap::new();
        if !interface_ids.is_empty() {
            let ips_models = ip_addresses::Entity::find()
                .filter(ip_addresses::Column::InterfaceId.is_in(interface_ids))
                .select_only()
                .column(ip_addresses::Column::Id)
                .column(ip_addresses::Column::InterfaceId)
                .column(ip_addresses::Column::NetworkId)
                .column_as(sea_orm::sea_query::Expr::col(ip_addresses::Column::IpAddress).cast_as(sea_orm::sea_query::Alias::new("text")), "ip_address")
                .column_as(sea_orm::sea_query::Expr::col(ip_addresses::Column::MacAddress).cast_as(sea_orm::sea_query::Alias::new("text")), "mac_address")
                .column(ip_addresses::Column::IsStatic)
                .column(ip_addresses::Column::Status)
                .column(ip_addresses::Column::Description)
                .into_model::<ip_addresses::Model>()
                .all(&self.conn)
                .await?;

            for ip in ips_models {
                // Just take the first one found for the interface
                interface_ip_map.entry(ip.interface_id.unwrap()).or_insert(ip);
            }
        }

        Ok(devices_models
            .into_iter()
            .map(|d| {
                let dt = match d.r#type.as_str() {
                    "PHYSICAL" => DeviceType::Physical,
                    "VM" => DeviceType::Vm,
                    "LXC" => DeviceType::Lxc,
                    "CONTAINER" => DeviceType::Container,
                    "SWITCH" => DeviceType::Switch,
                    "AP" => DeviceType::Ap,
                    "ROUTER" => DeviceType::Router,
                    _ => DeviceType::Other,
                };
                
                let primary_interface = device_interface_map.get(&d.id);
                let mac_address = primary_interface
                    .and_then(|i| i.mac_address.as_ref().map(|m| m.0));

                let primary_ip = primary_interface
                    .and_then(|i| interface_ip_map.get(&i.id))
                    .and_then(|ip| ip.ip_address.split('/').next().unwrap_or("").parse().ok());

                DeviceListView {
                    id: d.id,
                    hostname: d.hostname,
                    device_type: dt,
                    os_info: d.os_info,
                    created_at: d.created_at.into(),
                    primary_ip,
                    mac_address,
                }
            })
            .collect())
    }

    pub async fn get_device_details(
        &self,
        id: Uuid,
    ) -> Result<Option<DeviceDetails>, anyhow::Error> {
        let device_model = devices::Entity::find_by_id(id).one(&self.conn).await?;

        let d = match device_model {
            Some(d) => d,
            None => return Ok(None),
        };

        // Fetch all interfaces
        let interfaces_models = interfaces::Entity::find()
            .filter(interfaces::Column::DeviceId.eq(d.id))
            .select_only()
            .column(interfaces::Column::Id)
            .column(interfaces::Column::DeviceId)
            .column(interfaces::Column::Name)
            .column_as(sea_orm::sea_query::Expr::col(interfaces::Column::MacAddress).cast_as(sea_orm::sea_query::Alias::new("text")), "mac_address")
            .column(interfaces::Column::Type)
            .column(interfaces::Column::CreatedAt)
            .into_model::<interfaces::Model>()
            .all(&self.conn)
            .await?;

        // Fetch all IPs for these interfaces
        let interface_ids: Vec<Uuid> = interfaces_models.iter().map(|i| i.id).collect();
        let mut ips_map: HashMap<Uuid, Vec<crate::models::IpAddress>> = HashMap::new();

        if !interface_ids.is_empty() {
             let ips_models = ip_addresses::Entity::find()
                .filter(ip_addresses::Column::InterfaceId.is_in(interface_ids))
                .select_only()
                .column(ip_addresses::Column::Id)
                .column(ip_addresses::Column::InterfaceId)
                .column(ip_addresses::Column::NetworkId)
                .column_as(sea_orm::sea_query::Expr::col(ip_addresses::Column::IpAddress).cast_as(sea_orm::sea_query::Alias::new("text")), "ip_address")
                .column_as(sea_orm::sea_query::Expr::col(ip_addresses::Column::MacAddress).cast_as(sea_orm::sea_query::Alias::new("text")), "mac_address")
                .column(ip_addresses::Column::IsStatic)
                .column(ip_addresses::Column::Status)
                .column(ip_addresses::Column::Description)
                .into_model::<ip_addresses::Model>()
                .all(&self.conn)
                .await?;
            
            for ip in ips_models {
                let pid = ip.interface_id.unwrap();
                let status = match ip.status.as_str() {
                    "ACTIVE" => crate::models::IpStatus::Active,
                    "RESERVED" => crate::models::IpStatus::Reserved,
                    "DHCP" => crate::models::IpStatus::Dhcp,
                     _ => crate::models::IpStatus::Active, // Default
                };

                let ip_entity = crate::models::IpAddress {
                    id: ip.id,
                    network_id: ip.network_id,
                    interface_id: ip.interface_id,
                    ip_address: ip.ip_address.split('/').next().unwrap_or("").parse().unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0))),
                    mac_address: ip.mac_address.map(|m| m.0),
                    status,
                    description: ip.description,
                    is_static: ip.is_static,
                };

                ips_map.entry(pid).or_default().push(ip_entity);
            }
        }

        let dt = match d.r#type.as_str() {
            "PHYSICAL" => DeviceType::Physical,
            "VM" => DeviceType::Vm,
            "LXC" => DeviceType::Lxc,
            "CONTAINER" => DeviceType::Container,
            "SWITCH" => DeviceType::Switch,
            "AP" => DeviceType::Ap,
            "ROUTER" => DeviceType::Router,
            _ => DeviceType::Other,
        };

        let device_entity = Device {
            id: d.id,
            parent_device_id: d.parent_device_id,
            hostname: d.hostname,
            device_type: dt,
            cpu_cores: d.cpu_cores,
            ram_gb: d.ram_gb,
            storage_gb: d.storage_gb,
            os_info: d.os_info,
            meta_data: d.meta_data,
            created_at: d.created_at.into(),
        };

        let interfaces_with_ips = interfaces_models.into_iter().map(|i| {
             let interface_entity = crate::models::Interface {
                id: i.id,
                device_id: i.device_id,
                name: i.name,
                mac_address: i.mac_address.map(|m| m.0),
                interface_type: i.r#type,
            };
            InterfaceWithIps {
                interface: interface_entity,
                ips: ips_map.remove(&i.id).unwrap_or_default(),
            }
        }).collect();

        // Fetch services for this device
        let services_models = services::Entity::find()
            .filter(services::Column::DeviceId.eq(d.id))
            .all(&self.conn)
            .await?;

        let services = services_models.into_iter().map(|s| crate::models::Service {
            id: s.id,
            device_id: s.device_id,
            name: s.name,
            base_url: s.base_url,
            health_endpoint: s.health_endpoint,
            monitor_interval_seconds: s.monitor_interval_seconds,
            total_checks: s.total_checks,
            successful_checks: s.successful_checks,
            is_public: s.is_public,
        }).collect();

        Ok(Some(DeviceDetails {
            device: device_entity,
            interfaces: interfaces_with_ips,
            services,
        }))
    }

    pub async fn create_device(&self, params: CreateDevicePayload) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();

        let txn = self.conn.begin().await?;

        let device = devices::ActiveModel {
            id: Set(new_id),
            parent_device_id: Set(params.parent_device_id),
            hostname: Set(params.hostname),
            r#type: Set(params.device_type),
            os_info: Set(params.os_info),
            cpu_cores: Set(params.cpu_cores),
            ram_gb: Set(params.ram_gb),
            storage_gb: Set(params.storage_gb),
            ..Default::default()
        };
        device.insert(&txn).await?;

        // Create default interface 'eth0'
        let interface_id = Uuid::now_v7();
        let mac = params.mac_address;

        let sql = r#"
            INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
            VALUES ($1, $2, $3, $4::macaddr, $5, $6)
        "#;

        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![
                interface_id.into(),
                new_id.into(),
                "eth0".into(),
                mac.map(|m| m.to_string()).into(),
                "ethernet".into(),
                chrono::Utc::now().into(),
            ],
        );

        txn.execute(stmt).await?;

        txn.commit().await?;

        Ok(new_id)
    }

    pub async fn update_device(
        &self,
        id: Uuid,
        params: CreateDevicePayload,
    ) -> Result<bool, anyhow::Error> {
        let txn = self.conn.begin().await?;

        let device_model = match devices::Entity::find_by_id(id).one(&txn).await? {
            Some(d) => d,
            None => return Ok(false),
        };

        let mut device: devices::ActiveModel = device_model.into();

        device.parent_device_id = Set(params.parent_device_id);
        device.hostname = Set(params.hostname);
        device.r#type = Set(params.device_type);
        device.os_info = Set(params.os_info);
        device.cpu_cores = Set(params.cpu_cores);
        device.ram_gb = Set(params.ram_gb);
        device.storage_gb = Set(params.storage_gb);

        device.update(&txn).await?;
        
        // Update eth0 mac if provided
        if let Some(mac_str) = params.mac_address {
            // Try parsing first
            if let Ok(mac) = mac_str.parse::<mac_address::MacAddress>() {
                // Try find existing eth0
                let eth0 = interfaces::Entity::find()
                    .filter(interfaces::Column::DeviceId.eq(id))
                    .filter(interfaces::Column::Name.eq("eth0"))
                    .one(&txn) 
                    .await?;

                if let Some(eth0_model) = eth0 {
                    let mut eth0: interfaces::ActiveModel = eth0_model.into();
                    eth0.mac_address = Set(Some(crate::models::types::MacAddress(mac)));
                    eth0.update(&txn).await?;
                } else {
                    // create if missing
                    let interface = interfaces::ActiveModel {
                        id: Set(Uuid::now_v7()),
                        device_id: Set(id),
                        name: Set("eth0".to_string()),
                        mac_address: Set(Some(crate::models::types::MacAddress(mac))),
                        r#type: Set(Some("ethernet".to_string())),
                        created_at: Set(chrono::Utc::now().into()),
                        ..Default::default()
                    };
                    interface.insert(&txn).await?;
                }
            }
        }

        txn.commit().await?;
        Ok(true)
    }

    pub async fn delete_device(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let res = devices::Entity::delete_by_id(id).exec(&self.conn).await?;
        Ok(res.rows_affected > 0)
    }
}
