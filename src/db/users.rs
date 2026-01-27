use super::Db;
use uuid::Uuid;

impl Db {
    pub async fn create_user(
        &self,
        username: &str,
        email: &str,
        password_hash: &str,
        role: &str,
    ) -> Result<Uuid, sqlx::Error> {
        let existing = sqlx::query!("SELECT id FROM users WHERE username = $1", username)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = existing {
            return Ok(row.id);
        }

        let new_id = Uuid::now_v7();
        sqlx::query!(
            r#"
            INSERT INTO users (id, username, email, password_hash, role)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            new_id,
            username,
            email,
            password_hash,
            role
        )
        .execute(&self.pool)
        .await?;

        Ok(new_id)
    }

    pub async fn get_user_by_username(
        &self,
        username: &str,
    ) -> Result<Option<(Uuid, String, String, String)>, sqlx::Error> {
        let user = sqlx::query!(
            "SELECT id, username, role, password_hash FROM users WHERE username = $1",
            username
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user.map(|row| {
            (
                row.id,
                row.username,
                row.role,
                row.password_hash.unwrap_or_default(),
            )
        }))
    }
}
