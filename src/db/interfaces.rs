use super::Db;
use crate::entities::interfaces;
use crate::models::{CreateInterfacePayload, Interface};
use sea_orm::*;
use uuid::Uuid;

impl Db {
    pub async fn create_interface(
        &self,
        device_id: Uuid,
        params: CreateInterfacePayload,
    ) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();
        let mac = params.mac_address; // String

        let interface = interfaces::ActiveModel {
            id: Set(new_id),
            device_id: Set(device_id),
            name: Set(params.name),
            mac_address: Set(mac),
            r#type: Set(Some(params.interface_type)),
            ..Default::default()
        };

        interface.insert(&self.conn).await?;
        Ok(new_id)
    }

    pub async fn delete_interface(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let res = interfaces::Entity::delete_by_id(id)
            .exec(&self.conn)
            .await?;
        Ok(res.rows_affected > 0)
    }

    pub async fn list_interfaces(&self, device_id: Uuid) -> Result<Vec<Interface>, anyhow::Error> {
        let interfaces = interfaces::Entity::find()
            .filter(interfaces::Column::DeviceId.eq(device_id))
            .order_by_asc(interfaces::Column::Name)
            .all(&self.conn)
            .await?;

        Ok(interfaces
            .into_iter()
            .map(|i| Interface {
                id: i.id,
                device_id: i.device_id,
                name: i.name,
                mac_address: i.mac_address.and_then(|s| s.parse().ok()),
                interface_type: i.r#type,
            })
            .collect())
    }
}
