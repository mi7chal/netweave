use super::Db;
use crate::entities::{devices, interfaces, ip_addresses, networks, services};
use crate::models::{
    CreateDevicePayload, Device, DeviceDetails, DeviceListView, DeviceType, InterfaceWithIps,
};
use sea_orm::sea_query::{Alias, Expr};
use sea_orm::*;
use sea_orm::{QueryOrder, QuerySelect};
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
                    devices::Relation::Interfaces.def(),
                )
                .join(
                    sea_orm::JoinType::LeftJoin,
                    ip_addresses::Relation::Interface.def().rev(),
                )
                .filter(
                    Condition::any()
                        .add(devices::Column::Hostname.like(&s))
                        .add(devices::Column::Type.like(&s))
                        .add(devices::Column::OsInfo.like(&s))
                        .add(mac_cast.clone().like(&s))
                        .add(ip_cast.clone().like(&s)),
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

        let interfaces_models = interfaces::Entity::find()
            .filter(interfaces::Column::DeviceId.is_in(device_ids))
            .filter(interfaces::Column::Name.eq("eth0"))
            .all(&self.conn)
            .await?;

        let interface_ids: Vec<Uuid> = interfaces_models.iter().map(|i| i.id).collect();
        // Map device_id -> Interface
        let mut device_interface_map = HashMap::new();
        for i in &interfaces_models {
            device_interface_map.insert(i.device_id, i);
        }
        let mut interface_ip_map: HashMap<Uuid, &ip_addresses::Model> = HashMap::new();
        let ips_models = if !interface_ids.is_empty() {
            ip_addresses::Entity::find()
                .filter(ip_addresses::Column::InterfaceId.is_in(interface_ids))
                .all(&self.conn)
                .await?
        } else {
            vec![]
        };

        // Prefer static IPs when choosing the primary IP for display
        for ip in &ips_models {
            let Some(iface_id) = ip.interface_id else {
                continue;
            };
            let existing = interface_ip_map.get(&iface_id);
            let should_insert = match existing {
                None => true,
                Some(current) => !current.is_static && ip.is_static,
            };
            if should_insert {
                interface_ip_map.insert(iface_id, ip);
            }
        }

        Ok(devices_models
            .into_iter()
            .map(|d| {
                let dt: DeviceType = d.r#type.as_str().into();

                let primary_interface = device_interface_map.get(&d.id);
                let mac_address =
                    primary_interface.and_then(|i| i.mac_address.as_ref().map(|m| m.0));

                let primary_ip_record = primary_interface.and_then(|i| interface_ip_map.get(&i.id));

                let primary_ip = primary_ip_record.map(|ip| ip.ip_address.ip());
                let is_static = primary_ip_record.map(|ip| ip.is_static);

                DeviceListView {
                    id: d.id,
                    hostname: d.hostname,
                    device_type: dt,
                    os_info: d.os_info,
                    created_at: d.created_at.into(),
                    primary_ip,
                    mac_address,
                    is_static,
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
            .all(&self.conn)
            .await?;

        // Fetch all IPs for these interfaces
        let interface_ids: Vec<Uuid> = interfaces_models.iter().map(|i| i.id).collect();
        let mut ips_map: HashMap<Uuid, Vec<crate::models::IpAddress>> = HashMap::new();

        if !interface_ids.is_empty() {
            let ips_models = ip_addresses::Entity::find()
                .filter(ip_addresses::Column::InterfaceId.is_in(interface_ids))
                .all(&self.conn)
                .await?;

            for ip in ips_models {
                if let Some(interface_id) = ip.interface_id {
                    ips_map
                        .entry(interface_id)
                        .or_default()
                        .push(crate::models::IpAddress::from(ip));
                }
            }
        }

        let device_entity = Device::from(d);

        let interfaces_with_ips = interfaces_models
            .into_iter()
            .map(|i| {
                let iface_id = i.id;
                InterfaceWithIps {
                    interface: crate::models::Interface::from(i),
                    ips: ips_map.remove(&iface_id).unwrap_or_default(),
                }
            })
            .collect();

        // Fetch services for this device
        let services_models = services::Entity::find()
            .filter(services::Column::DeviceId.eq(device_entity.id))
            .all(&self.conn)
            .await?;

        Ok(Some(DeviceDetails {
            device: device_entity,
            interfaces: interfaces_with_ips,
            services: services_models
                .into_iter()
                .map(crate::models::Service::from)
                .collect(),
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
        let mac_str = params.mac_address.clone();
        let interface_id = Uuid::now_v7();
        let sql = r#"
            INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
            VALUES ($1, $2, $3, CAST($4 AS macaddr), $5, $6)
        "#;
        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![
                interface_id.into(),
                new_id.into(),
                "eth0".to_string().into(),
                mac_str.into(),
                Some("ethernet".to_string()).into(),
                chrono::Utc::now().into(),
            ],
        );
        txn.execute(stmt).await?;

        // If an IP address was provided, create an IP assignment
        if let Some(ip_str) = params.ip_address {
            if let Ok(ip_addr) = ip_str.parse::<std::net::IpAddr>() {
                // Find the matching network by CIDR
                let all_networks = networks::Entity::find().all(&txn).await?;
                let matching_network = all_networks.iter().find(|n| n.cidr.contains(ip_addr));

                if let Some(network) = matching_network {
                    let ip_net = super::helpers::ip_to_network(ip_addr)?;
                    let ip_id = Uuid::now_v7();

                    let ip_sql = r#"
                        INSERT INTO ip_addresses (id, interface_id, network_id, ip_address, is_static, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (network_id, ip_address) DO NOTHING
                    "#;
                    let ip_stmt = Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        ip_sql,
                        vec![
                            ip_id.into(),
                            interface_id.into(),
                            network.id.into(),
                            ip_net.into(),
                            true.into(),
                            "ACTIVE".to_string().into(),
                        ],
                    );
                    txn.execute(ip_stmt).await?;
                } else {
                    tracing::warn!(
                        "No matching network found for IP {}, skipping IP assignment",
                        ip_addr
                    );
                }
            }
        }

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
            if let Ok(_mac) = mac_str.parse::<mac_address::MacAddress>() {
                // Try find existing eth0
                let eth0 = interfaces::Entity::find()
                    .filter(interfaces::Column::DeviceId.eq(id))
                    .filter(interfaces::Column::Name.eq("eth0"))
                    .one(&txn)
                    .await?;

                if let Some(eth0_model) = eth0 {
                    let sql = r#"
                        UPDATE interfaces SET mac_address = CAST($1 AS macaddr)
                        WHERE id = $2
                    "#;
                    let stmt = Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        sql,
                        vec![mac_str.into(), eth0_model.id.into()],
                    );
                    txn.execute(stmt).await?;
                } else {
                    // create if missing
                    let sql = r#"
                        INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
                        VALUES ($1, $2, $3, CAST($4 AS macaddr), $5, $6)
                    "#;
                    let stmt = Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        sql,
                        vec![
                            Uuid::now_v7().into(),
                            id.into(),
                            "eth0".to_string().into(),
                            mac_str.into(),
                            Some("ethernet".to_string()).into(),
                            chrono::Utc::now().into(),
                        ],
                    );
                    txn.execute(stmt).await?;
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
