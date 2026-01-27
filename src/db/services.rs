use super::Db;
use crate::models::{CreateServicePayload, DashboardService, Service};
use uuid::Uuid;

impl Db {
    pub async fn list_dashboard_services(&self) -> Result<Vec<DashboardService>, sqlx::Error> {
        sqlx::query_as!(
            DashboardService,
            r#"
            SELECT
                s.id, s.name, s.base_url,
                COALESCE(s.is_public, false) as "is_public!",
                COALESCE(d.hostname, '') as "device_hostname!"
            FROM services s
            LEFT JOIN devices d ON s.device_id = d.id
            ORDER BY s.name ASC
            "#
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_service(&self, id: Uuid) -> Result<Option<Service>, sqlx::Error> {
        sqlx::query_as!(
            Service,
            r#"
            SELECT id, device_id, name, base_url, health_endpoint, monitor_interval_seconds, is_public
            FROM services
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_service(&self, params: CreateServicePayload) -> Result<Uuid, sqlx::Error> {
        let new_id = Uuid::now_v7();
        sqlx::query!(
            r#"
            INSERT INTO services (id, name, base_url, device_id, is_public)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            new_id,
            params.name,
            params.base_url,
            params.device_id,
            params.is_public
        )
        .execute(&self.pool)
        .await?;
        Ok(new_id)
    }

    pub async fn update_service(
        &self,
        id: Uuid,
        params: CreateServicePayload,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!(
            r#"
            UPDATE services
            SET name = $1, base_url = $2, device_id = $3, is_public = $4
            WHERE id = $5
            "#,
            params.name,
            params.base_url,
            params.device_id,
            params.is_public,
            id
        )
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_service(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM services WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
