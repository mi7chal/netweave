use super::Db;
use crate::entities::users;
use sea_orm::*;
use uuid::Uuid;

impl Db {
    pub async fn create_user(
        &self,
        username: &str,
        email: &str,
        password_hash: &str,
        role: &str,
    ) -> Result<Uuid, anyhow::Error> {
        let existing = users::Entity::find()
            .filter(users::Column::Username.eq(username))
            .one(&self.conn)
            .await?;

        if let Some(user) = existing {
            return Ok(user.id);
        }

        let new_id = Uuid::now_v7();
        let user = users::ActiveModel {
            id: Set(new_id),
            username: Set(username.to_string()),
            email: Set(email.to_string()),
            password_hash: Set(Some(password_hash.to_string())),
            role: Set(role.to_string()),
            ..Default::default()
        };

        user.insert(&self.conn).await?;
        Ok(new_id)
    }

    pub async fn get_user_by_username(
        &self,
        username: &str,
    ) -> Result<Option<(Uuid, String, String, String)>, anyhow::Error> {
        let user = users::Entity::find()
            .filter(users::Column::Username.eq(username))
            .one(&self.conn)
            .await?;

        Ok(user.map(|u| {
            (
                u.id,
                u.username,
                u.role,
                u.password_hash.unwrap_or_default(),
            )
        }))
    }
}
