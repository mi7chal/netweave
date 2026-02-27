use super::Db;
use crate::entities::settings;
use sea_orm::*;
use std::collections::HashMap;

impl Db {
    pub async fn get_settings(&self) -> Result<HashMap<String, String>, anyhow::Error> {
        let rows = settings::Entity::find().all(&self.conn).await?;
        Ok(rows.into_iter().map(|r| (r.key, r.value)).collect())
    }

    pub async fn set_setting(&self, key: &str, value: &str) -> Result<(), anyhow::Error> {
        let model = settings::ActiveModel {
            key: Set(key.to_string()),
            value: Set(value.to_string()),
            updated_at: Set(chrono::Utc::now().into()),
        };
        settings::Entity::insert(model)
            .on_conflict(
                sea_query::OnConflict::column(settings::Column::Key)
                    .update_column(settings::Column::Value)
                    .update_column(settings::Column::UpdatedAt)
                    .to_owned(),
            )
            .exec(&self.conn)
            .await?;
        Ok(())
    }
}
