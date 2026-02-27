use crate::handlers::common::AppResult;
use crate::AppState;
use axum::{extract::State, Json};
use serde::Deserialize;
use std::collections::HashMap;

pub async fn get_settings(State(state): State<AppState>) -> AppResult<Json<HashMap<String, String>>> {
    Ok(Json(state.db.get_settings().await?))
}

#[derive(Deserialize)]
pub struct UpdateSettingsPayload {
    pub homepage_public: Option<bool>,
}

pub async fn update_settings(
    State(state): State<AppState>,
    Json(payload): Json<UpdateSettingsPayload>,
) -> AppResult<Json<HashMap<String, String>>> {
    if let Some(v) = payload.homepage_public {
        state.db.set_setting("homepage_public", &v.to_string()).await?;
    }
    Ok(Json(state.db.get_settings().await?))
}
