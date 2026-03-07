use super::Db;
use crate::entities::users;
use sea_orm::*;
use uuid::Uuid;

pub struct UserCredentials {
    pub id: Uuid,
    pub username: String,
    pub role: String,
    pub password_hash: Option<String>,
    pub is_active: bool,
}

impl Db {
    pub async fn create_user(
        &self,
        username: &str,
        email: &str,
        password_hash: Option<&str>,
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
            password_hash: Set(password_hash.map(|s| s.to_string())),
            role: Set(role.to_string()),
            ..Default::default()
        };

        user.insert(&self.conn).await?;
        Ok(new_id)
    }

    pub async fn get_user_by_username(
        &self,
        username: &str,
    ) -> Result<Option<UserCredentials>, anyhow::Error> {
        let user = users::Entity::find()
            .filter(users::Column::Username.eq(username))
            .one(&self.conn)
            .await?;

        Ok(user.map(|u| UserCredentials {
            id: u.id,
            username: u.username,
            role: u.role,
            password_hash: u.password_hash,
            is_active: u.is_active,
        }))
    }

    pub async fn get_user_by_id(&self, id: Uuid) -> Result<Option<UserCredentials>, anyhow::Error> {
        let user = users::Entity::find_by_id(id).one(&self.conn).await?;

        Ok(user.map(|u| UserCredentials {
            id: u.id,
            username: u.username,
            role: u.role,
            password_hash: u.password_hash,
            is_active: u.is_active,
        }))
    }

    pub async fn update_user_password_hash(
        &self,
        id: Uuid,
        password_hash: &str,
    ) -> Result<bool, anyhow::Error> {
        let user = users::Entity::find_by_id(id).one(&self.conn).await?;
        let Some(user) = user else {
            return Ok(false);
        };

        let mut user = user.into_active_model();
        user.password_hash = Set(Some(password_hash.to_string()));
        user.update(&self.conn).await?;

        Ok(true)
    }
}
