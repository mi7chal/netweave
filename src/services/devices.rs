use crate::db::Db;
use crate::models::{CreateDevicePayload, DeviceDetails};
use crate::validation;
use anyhow::Result;
use uuid::Uuid;

pub struct DeviceService;

impl DeviceService {
    /// Create a device with validation and audit logging
    pub async fn create(db: &Db, payload: CreateDevicePayload) -> Result<Uuid> {
        // 1. Validate input
        validation::validate_hostname(&payload.hostname)?;

        // 2. Create device
        let device_id = db.create_device(payload).await?;

        // 3. Log audit event (future enhancement)
        // audit::log(db, "CREATE_DEVICE", device_id).await?;

        Ok(device_id)
    }

    pub async fn update(db: &Db, id: Uuid, payload: CreateDevicePayload) -> Result<bool> {
        validation::validate_hostname(&payload.hostname)?;
        db.update_device(id, payload).await
    }

    pub async fn delete(db: &Db, id: Uuid) -> Result<()> {
        db.delete_device(id).await?;
        Ok(())
    }

    pub async fn get_details(db: &Db, id: Uuid) -> Result<Option<DeviceDetails>> {
        db.get_device_details(id).await
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_create_device_validates_hostname() {
        // Future: add tests with test database
    }
}
