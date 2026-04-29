use crate::db::Db;
use crate::entities::devices;
use sea_orm::EntityTrait;
use uuid::Uuid;

impl Db {
    pub async fn delete_device(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let result = devices::Entity::delete_by_id(id).exec(&self.conn).await?;
        Ok(result.rows_affected > 0)
    }
}
