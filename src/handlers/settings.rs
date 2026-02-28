use crate::handlers::common::AppResult;
use crate::AppState;
use axum::{extract::State, Json};
use serde::Deserialize;
use std::collections::HashMap;

pub async fn get_settings(
    State(state): State<AppState>,
) -> AppResult<Json<HashMap<String, String>>> {
    Ok(Json(state.db.get_settings().await?))
}

/// Public endpoint that returns only settings safe for unauthenticated access.
pub async fn get_public_settings(
    State(state): State<AppState>,
) -> AppResult<Json<HashMap<String, String>>> {
    let all = state.db.get_settings().await?;
    let public_keys = ["homepage_public"];
    let public: HashMap<String, String> = all
        .into_iter()
        .filter(|(k, _)| public_keys.contains(&k.as_str()))
        .collect();
    Ok(Json(public))
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
        state
            .db
            .set_setting("homepage_public", &v.to_string())
            .await?;
    }
    Ok(Json(state.db.get_settings().await?))
}
