use super::Db;
use crate::entities::interfaces;
use crate::models::{CreateInterfacePayload, Interface};
use sea_orm::*;
use uuid::Uuid;
use chrono::Utc;
impl Db {
    pub async fn create_interface(
        &self,
        device_id: Uuid,
        params: CreateInterfacePayload,
    ) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();
        let mac = params.mac_address; // String

        let sql = r#"
            INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
            VALUES ($1, $2, $3, $4::macaddr, $5, $6)
        "#;

        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![
                new_id.into(),
                device_id.into(),
                params.name.into(),
                mac.map(|m| m.to_string()).into(),
                params.interface_type.into(),
                Utc::now().into(),
            ],
        );

        self.conn.execute(stmt).await?;
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
            .select_only()
            .column(interfaces::Column::Id)
            .column(interfaces::Column::DeviceId)
            .column(interfaces::Column::Name)
            .column_as(sea_orm::sea_query::Expr::col(interfaces::Column::MacAddress).cast_as(sea_orm::sea_query::Alias::new("text")), "mac_address")
            .column(interfaces::Column::Type)
            .column(interfaces::Column::CreatedAt)
            .filter(interfaces::Column::DeviceId.eq(device_id))
            .order_by_asc(interfaces::Column::Name)
            .into_model::<interfaces::Model>()
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
