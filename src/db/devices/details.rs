use crate::db::Db;
use crate::entities::{devices, interfaces, ip_addresses, services};
use crate::models::{Device, DeviceDetails, InterfaceWithIps};
use sea_orm::*;
use std::collections::HashMap;
use uuid::Uuid;

impl Db {
    pub async fn get_device_details(
        &self,
        id: Uuid,
    ) -> Result<Option<DeviceDetails>, anyhow::Error> {
        let device_model = devices::Entity::find_by_id(id).one(&self.conn).await?;

        let device_model = match device_model {
            Some(model) => model,
            None => return Ok(None),
        };

        let interfaces_models = interfaces::Entity::find()
            .filter(interfaces::Column::DeviceId.eq(device_model.id))
            .all(&self.conn)
            .await?;

        let interface_ids: Vec<Uuid> = interfaces_models.iter().map(|iface| iface.id).collect();
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

        let device = Device::from(device_model);
        let interfaces_with_ips = interfaces_models
            .into_iter()
            .map(|iface| {
                let iface_id = iface.id;
                InterfaceWithIps {
                    interface: crate::models::Interface::from(iface),
                    ips: ips_map.remove(&iface_id).unwrap_or_default(),
                }
            })
            .collect();

        let services_models = services::Entity::find()
            .filter(services::Column::DeviceId.eq(device.id))
            .all(&self.conn)
            .await?;

        Ok(Some(DeviceDetails {
            device,
            interfaces: interfaces_with_ips,
            services: services_models
                .into_iter()
                .map(crate::models::Service::from)
                .collect(),
        }))
    }
}
