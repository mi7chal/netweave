use super::Db;
use crate::models::{CreateDevicePayload, Device, DeviceType};
use uuid::Uuid;

impl Db {
    pub async fn list_devices(&self, search: Option<String>) -> Result<Vec<Device>, sqlx::Error> {
        let search = search.unwrap_or_default();
        let search_pattern = format!("%{}%", search);

        // We select 'type' directly. The Device struct has #[sqlx(rename = "type")] on device_type field,
        // so it expects a column named "type".
        sqlx::query_as!(
            Device,
            r#"
            SELECT
                id, parent_device_id, hostname,
                type as "device_type: DeviceType",
                cpu_cores, ram_gb, storage_gb, os_info,
                meta_data, created_at
            FROM devices
            WHERE hostname ILIKE $1 OR type ILIKE $1 OR os_info ILIKE $1
            ORDER BY hostname ASC
            "#,
            search_pattern
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_device(&self, id: Uuid) -> Result<Option<Device>, sqlx::Error> {
        sqlx::query_as!(
            Device,
            r#"
            SELECT
                id, parent_device_id, hostname,
                type as "device_type: DeviceType",
                cpu_cores, ram_gb, storage_gb, os_info,
                meta_data, created_at
            FROM devices
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_device(&self, params: CreateDevicePayload) -> Result<Uuid, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let new_id = Uuid::now_v7();
        sqlx::query!(
            r#"
            INSERT INTO devices (id, parent_device_id, hostname, type, os_info, cpu_cores, ram_gb, storage_gb)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            new_id,
            params.parent_device_id,
            params.hostname,
            params.device_type,
            params.os_info,
            params.cpu_cores,
            params.ram_gb,
            params.storage_gb
        )
        .execute(&mut *tx)
        .await?;

        // Create default interface 'eth0'
        let interface_id = Uuid::now_v7();
        let mac = params
            .mac_address
            .as_deref()
            .filter(|s| !s.is_empty())
            .and_then(|s| s.parse::<mac_address::MacAddress>().ok());

        sqlx::query!(
            r#"
            INSERT INTO interfaces (id, device_id, name, mac_address)
            VALUES ($1, $2, 'eth0', $3)
            "#,
            interface_id,
            new_id,
            mac as _
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(new_id)
    }

    pub async fn update_device(
        &self,
        id: Uuid,
        params: CreateDevicePayload,
    ) -> Result<bool, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let result = sqlx::query!(
            r#"
            UPDATE devices
            SET parent_device_id = $1, hostname = $2, type = $3, os_info = $4, cpu_cores = $5, ram_gb = $6, storage_gb = $7
            WHERE id = $8
            "#,
            params.parent_device_id,
            params.hostname,
            params.device_type,
            params.os_info,
            params.cpu_cores,
            params.ram_gb,
            params.storage_gb,
            id
        )
        .execute(&mut *tx)
        .await?;

        let mac = params
            .mac_address
            .as_deref()
            .filter(|s| !s.is_empty())
            .and_then(|s| s.parse::<mac_address::MacAddress>().ok());

        if let Some(m) = mac {
            sqlx::query!(
                r#"
                UPDATE interfaces
                SET mac_address = $1
                WHERE device_id = $2 AND name = 'eth0'
                "#,
                m as _,
                id
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_device(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM devices WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
