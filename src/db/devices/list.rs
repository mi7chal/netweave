use crate::db::Db;
use crate::entities::{devices, interfaces, ip_addresses};
use crate::models::{DeviceListView, DeviceType};
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
            let search_like = format!("%{}%", search);

            // Allow casting INET/MACADDR to text for LIKE search.
            let mac_cast = Expr::col(interfaces::Column::MacAddress).cast_as(Alias::new("text"));
            let ip_cast = Expr::col(ip_addresses::Column::IpAddress).cast_as(Alias::new("text"));

            query = query
                .join(JoinType::LeftJoin, devices::Relation::Interfaces.def())
                .join(
                    JoinType::LeftJoin,
                    ip_addresses::Relation::Interface.def().rev(),
                )
                .filter(
                    Condition::any()
                        .add(devices::Column::Hostname.like(&search_like))
                        .add(devices::Column::Type.like(&search_like))
                        .add(devices::Column::OsInfo.like(&search_like))
                        .add(mac_cast.clone().like(&search_like))
                        .add(ip_cast.clone().like(&search_like)),
                )
                // Group by to avoid duplicates since we're joining 1-to-many relationships.
                .group_by(devices::Column::Id);
        }

        let devices_models = query
            .order_by_asc(devices::Column::Hostname)
            .all(&self.conn)
            .await?;

        if devices_models.is_empty() {
            return Ok(vec![]);
        }

        let device_ids: Vec<Uuid> = devices_models.iter().map(|device| device.id).collect();

        let interfaces_models = interfaces::Entity::find()
            .filter(interfaces::Column::DeviceId.is_in(device_ids))
            .filter(interfaces::Column::Name.eq("eth0"))
            .all(&self.conn)
            .await?;

        let interface_ids: Vec<Uuid> = interfaces_models.iter().map(|iface| iface.id).collect();

        let mut device_interface_map = HashMap::new();
        for iface in &interfaces_models {
            device_interface_map.insert(iface.device_id, iface);
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

        // Prefer static IPs when choosing the primary IP for display.
        for ip in &ips_models {
            let Some(interface_id) = ip.interface_id else {
                continue;
            };
            let existing = interface_ip_map.get(&interface_id);
            let should_insert = match existing {
                None => true,
                Some(current) => !current.is_static && ip.is_static,
            };
            if should_insert {
                interface_ip_map.insert(interface_id, ip);
            }
        }

        Ok(devices_models
            .into_iter()
            .map(|device| {
                let device_type: DeviceType = device.r#type.as_str().into();
                let primary_interface = device_interface_map.get(&device.id);
                let mac_address =
                    primary_interface.and_then(|iface| iface.mac_address.as_ref().map(|mac| mac.0));

                let primary_ip_record =
                    primary_interface.and_then(|iface| interface_ip_map.get(&iface.id));

                let primary_ip = primary_ip_record.map(|ip| ip.ip_address.ip());
                let is_static = primary_ip_record.map(|ip| ip.is_static);

                DeviceListView {
                    id: device.id,
                    hostname: device.hostname,
                    device_type,
                    os_info: device.os_info,
                    created_at: device.created_at.into(),
                    primary_ip,
                    mac_address,
                    is_static,
                }
            })
            .collect())
    }
}
