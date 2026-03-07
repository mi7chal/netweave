use super::Db;
use crate::entities::devices;
use crate::entities::services;
use crate::models::{CreateServicePayload, DashboardService, Service};
use sea_orm::*;
use uuid::Uuid;

impl Db {
    pub async fn list_dashboard_services(&self) -> Result<Vec<DashboardService>, anyhow::Error> {
        // Query services with device info
        let services_models = services::Entity::find()
            .find_also_related(devices::Entity)
            .order_by_asc(services::Column::Name)
            .all(&self.conn)
            .await?;

        let dashboard_services = services_models
            .into_iter()
            .map(|(service, device)| DashboardService {
                id: service.id,
                name: service.name,
                base_url: service.base_url,
                is_public: service.is_public.unwrap_or(false),
                total_checks: service.total_checks.unwrap_or(0),
                successful_checks: service.successful_checks.unwrap_or(0),
                device_hostname: device
                    .as_ref()
                    .map(|d| d.hostname.clone())
                    .unwrap_or_default(),
                device_id: device.map(|d| d.id),
                icon_url: service.icon_url,
            })
            .collect();

        Ok(dashboard_services)
    }

    pub async fn get_service(&self, id: Uuid) -> Result<Option<Service>, anyhow::Error> {
        let row = services::Entity::find_by_id(id).one(&self.conn).await?;
        Ok(row.map(Service::from))
    }

    pub async fn create_service(
        &self,
        params: CreateServicePayload,
    ) -> Result<Uuid, anyhow::Error> {
        let new_id = Uuid::now_v7();
        let service = services::ActiveModel {
            id: Set(new_id),
            name: Set(params.name),
            base_url: Set(params.base_url),
            device_id: Set(params.device_id),
            is_public: Set(Some(params.is_public)),
            icon_url: Set(params.icon_url),
            ..Default::default()
        };

        service.insert(&self.conn).await?;
        Ok(new_id)
    }

    pub async fn update_service(
        &self,
        id: Uuid,
        params: CreateServicePayload,
    ) -> Result<bool, anyhow::Error> {
        let mut service: services::ActiveModel =
            match services::Entity::find_by_id(id).one(&self.conn).await? {
                Some(s) => s.into(),
                None => return Ok(false),
            };

        service.name = Set(params.name);
        service.base_url = Set(params.base_url);
        service.device_id = Set(params.device_id);
        service.is_public = Set(Some(params.is_public));
        service.icon_url = Set(params.icon_url);

        service.update(&self.conn).await?;
        Ok(true)
    }

    pub async fn delete_service(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let res = services::Entity::delete_by_id(id).exec(&self.conn).await?;
        Ok(res.rows_affected > 0)
    }
}
