use super::Db;
use crate::models::{CreateInterfacePayload, Interface};
use uuid::Uuid;

impl Db {
    pub async fn create_interface(
        &self,
        device_id: Uuid,
        params: CreateInterfacePayload,
    ) -> Result<Uuid, sqlx::Error> {
        let new_id = Uuid::now_v7();
        let mac = params
            .mac_address
            .as_deref()
            .filter(|s| !s.is_empty())
            .and_then(|s| s.parse::<mac_address::MacAddress>().ok());

        sqlx::query!(
            r#"
            INSERT INTO interfaces (id, device_id, name, mac_address, type)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            new_id,
            device_id,
            params.name,
            mac as _,
            params.interface_type
        )
        .execute(&self.pool)
        .await?;
        Ok(new_id)
    }

    pub async fn delete_interface(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM interfaces WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn list_interfaces(&self, device_id: Uuid) -> Result<Vec<Interface>, sqlx::Error> {
        sqlx::query_as!(
            Interface,
            r#"
            SELECT id, device_id, name, mac_address, type as "interface_type"
            FROM interfaces
            WHERE device_id = $1
            ORDER BY name ASC
            "#,
            device_id
        )
        .fetch_all(&self.pool)
        .await
    }
}
