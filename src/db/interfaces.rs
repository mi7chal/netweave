use super::Db;
use crate::entities::interfaces;
use crate::models::{CreateInterfacePayload, Interface};
use chrono::Utc;
use sea_orm::*;
use std::str::FromStr;
use uuid::Uuid;
impl Db {
    pub async fn create_interface(
        &self,
        device_id: Uuid,
        params: CreateInterfacePayload,
    ) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();
        let mac_str = params.mac_address.clone();

        let sql = r#"
            INSERT INTO interfaces (id, device_id, name, mac_address, type, created_at)
            VALUES ($1, $2, $3, CAST($4 AS macaddr), $5, $6)
        "#;

        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![
                new_id.into(),
                device_id.into(),
                params.name.into(),
                mac_str.into(),
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
        let rows = interfaces::Entity::find()
            .filter(interfaces::Column::DeviceId.eq(device_id))
            .order_by_asc(interfaces::Column::Name)
            .all(&self.conn)
            .await?;
        Ok(rows.into_iter().map(Interface::from).collect())
    }

    pub async fn update_interface(
        &self,
        id: Uuid,
        params: CreateInterfacePayload,
    ) -> Result<Interface, anyhow::Error> {
        let interface = interfaces::Entity::find_by_id(id)
            .one(&self.conn)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Interface not found"))?;
        let device_id = interface.device_id;

        let mac_str = params.mac_address.clone();

        let sql = r#"
            UPDATE interfaces 
            SET name = $1, type = $2, mac_address = CAST($3 AS macaddr)
            WHERE id = $4
        "#;

        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![
                params.name.clone().into(),
                Some(params.interface_type.clone()).into(),
                mac_str.clone().into(),
                id.into(),
            ],
        );

        self.conn.execute(stmt).await?;

        let mac = mac_str.and_then(|m| mac_address::MacAddress::from_str(&m).ok());

        Ok(Interface {
            id,
            device_id,
            name: params.name,
            mac_address: mac,
            interface_type: Some(params.interface_type),
        })
    }
}
