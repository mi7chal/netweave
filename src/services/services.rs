use crate::db::Db;
use crate::models::{CreateServicePayload, DashboardService};
use crate::validation;
use anyhow::Result;
use uuid::Uuid;

pub struct ServiceService;

impl ServiceService {
    /// Create a service with validation
    pub async fn create(db: &Db, payload: CreateServicePayload) -> Result<Uuid> {
        // 1. Validate input
        validation::validate_name(&payload.name, "Service name", 100)?;
        validation::validate_url(&payload.base_url)?;

        // 2. Create service
        let service_id = db.create_service(payload).await?;

        Ok(service_id)
    }

    pub async fn update(db: &Db, id: Uuid, payload: CreateServicePayload) -> Result<bool> {
        validation::validate_name(&payload.name, "Service name", 100)?;
        validation::validate_url(&payload.base_url)?;
        db.update_service(id, payload).await
    }

    pub async fn delete(db: &Db, id: Uuid) -> Result<()> {
        db.delete_service(id).await?;
        Ok(())
    }

    pub async fn list(db: &Db) -> Result<Vec<DashboardService>> {
        db.list_dashboard_services().await
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_service_validation() {
        // Future: add tests with test database
    }
}
