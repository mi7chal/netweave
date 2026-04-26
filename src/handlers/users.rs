use crate::auth::Role;
use crate::entities::users;
use crate::handlers::common::{AppError, AppResult};
use crate::models::{CreateUserPayload, UpdateUserPayload, User};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use bcrypt::{hash, DEFAULT_COST};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, IntoActiveModel, PaginatorTrait,
    QueryFilter, Set, SqlErr,
};
use std::str::FromStr;
use uuid::Uuid;

async fn active_admin_count(state: &AppState) -> Result<u64, AppError> {
    let count = users::Entity::find()
        .filter(users::Column::Role.eq(Role::Admin.as_str()))
        .filter(users::Column::IsActive.eq(true))
        .count(&state.db.conn)
        .await?;
    Ok(count)
}

fn role_or_bad_request(role: &str) -> AppResult<Role> {
    Role::from_str(role).map_err(AppError::BadRequest)
}

fn map_user_write_error(err: DbErr) -> AppError {
    if let Some(SqlErr::UniqueConstraintViolation(detail)) = err.sql_err() {
        if detail.contains("users_username_key") || detail.contains("users.username") {
            return AppError::Conflict("Username already exists".into());
        }
        if detail.contains("users_email_key") || detail.contains("users.email") {
            return AppError::Conflict("Email already exists".into());
        }
    }

    let msg = err.to_string();
    if msg.contains("users_username_key") || msg.contains("users.username") {
        return AppError::Conflict("Username already exists".into());
    }
    if msg.contains("users_email_key") || msg.contains("users.email") {
        return AppError::Conflict("Email already exists".into());
    }
    AppError::from(err)
}

pub async fn list_users(State(state): State<AppState>) -> AppResult<Json<Vec<User>>> {
    let users = users::Entity::find().all(&state.db.conn).await?;
    let user_models = users.into_iter().map(User::from).collect();
    Ok(Json(user_models))
}

pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<User>> {
    let user = users::Entity::find_by_id(id)
        .one(&state.db.conn)
        .await?
        .map(User::from)
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    Ok(Json(user))
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserPayload>,
) -> AppResult<Json<Uuid>> {
    let role = role_or_bad_request(&payload.role)?;
    let username = payload.username;
    let email = payload.email;

    let password_hash = if let Some(pwd) = payload.password {
        Some(hash(pwd, DEFAULT_COST).map_err(|e| AppError::Internal(e.into()))?)
    } else {
        None
    };

    let new_id = Uuid::now_v7();
    let user_model = users::ActiveModel {
        id: Set(new_id),
        username: Set(username),
        email: Set(email),
        role: Set(role.as_str().to_string()),
        password_hash: Set(password_hash),
        is_active: Set(payload.is_active),
        ..Default::default()
    };

    user_model
        .insert(&state.db.conn)
        .await
        .map_err(map_user_write_error)?;
    Ok(Json(new_id))
}

pub async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateUserPayload>,
) -> AppResult<Json<bool>> {
    let user_model = users::Entity::find_by_id(id)
        .one(&state.db.conn)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    let mut user = user_model.clone().into_active_model();

    let next_role = match payload.role.as_deref() {
        Some(role) => role_or_bad_request(role)?,
        None => role_or_bad_request(&user_model.role)?,
    };
    let next_is_active = payload.is_active.unwrap_or(user_model.is_active);

    // Keep at least one active admin in the system.
    if user_model.role == Role::Admin.as_str()
        && user_model.is_active
        && (!next_role.is_admin() || !next_is_active)
    {
        let admins = active_admin_count(&state).await?;
        if admins <= 1 {
            return Err(AppError::Forbidden(
                "Cannot deactivate or demote the last active admin user".into(),
            ));
        }
    }

    if let Some(username) = payload.username {
        user.username = Set(username);
    }
    if let Some(email) = payload.email {
        user.email = Set(email);
    }
    if let Some(role) = payload.role {
        user.role = Set(role_or_bad_request(&role)?.as_str().to_string());
    }
    if let Some(is_active) = payload.is_active {
        user.is_active = Set(is_active);
    }
    if let Some(password) = payload.password {
        if !password.is_empty() {
            let password_hash =
                hash(password, DEFAULT_COST).map_err(|e| AppError::Internal(e.into()))?;
            user.password_hash = Set(Some(password_hash));
        }
    }

    user.update(&state.db.conn)
        .await
        .map_err(map_user_write_error)?;
    Ok(Json(true))
}

pub async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let user = users::Entity::find_by_id(id)
        .one(&state.db.conn)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Keep at least one active admin in the system.
    if user.role == Role::Admin.as_str() && user.is_active {
        let admins = active_admin_count(&state).await?;
        if admins <= 1 {
            return Err(AppError::Forbidden(
                "Cannot delete the last active admin user".into(),
            ));
        }
    }

    let result = users::Entity::delete_by_id(id).exec(&state.db.conn).await?;

    if result.rows_affected == 0 {
        return Err(AppError::NotFound("User not found".into()));
    }

    Ok(StatusCode::NO_CONTENT)
}
