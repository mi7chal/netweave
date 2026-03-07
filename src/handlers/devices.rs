use crate::handlers::common::{AppError, AppResult};
use crate::models::{
    CreateDevicePayload, CreateInterfacePayload, DeviceDetails, DeviceIpView, DeviceListView,
    Interface,
};
use crate::validation;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct SearchParams {
    q: Option<String>,
}

pub async fn list_devices(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> AppResult<Json<Vec<DeviceListView>>> {
    Ok(Json(state.db.list_devices(params.q).await?))
}

pub async fn create_device(
    State(state): State<AppState>,
    Json(payload): Json<CreateDevicePayload>,
) -> AppResult<Json<Uuid>> {
    let device_id = crate::services::DeviceService::create(&state.db, payload).await?;
    Ok(Json(device_id))
}

pub async fn get_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<DeviceDetails>> {
    let device = state
        .db
        .get_device_details(id)
        .await?
        .ok_or(AppError::NotFound("Device not found".into()))?;
    Ok(Json(device))
}

pub async fn update_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateDevicePayload>,
) -> AppResult<Json<bool>> {
    let result = crate::services::DeviceService::update(&state.db, id, payload).await?;
    Ok(Json(result))
}

pub async fn delete_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    state.db.delete_device(id).await?;
    Ok(StatusCode::NO_CONTENT)
}

// --- Interfaces ---

pub async fn create_interface(
    State(state): State<AppState>,
    Path(device_id): Path<Uuid>,
    Json(payload): Json<CreateInterfacePayload>,
) -> AppResult<Json<Uuid>> {
    validation::validate_name(&payload.name, "Interface name", 50)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    Ok(Json(state.db.create_interface(device_id, payload).await?))
}

pub async fn update_interface(
    State(state): State<AppState>,
    Path((_device_id, interface_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<CreateInterfacePayload>,
) -> AppResult<Json<Interface>> {
    validation::validate_name(&payload.name, "Interface name", 50)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    Ok(Json(
        state.db.update_interface(interface_id, payload).await?,
    ))
}

pub async fn delete_interface(
    State(state): State<AppState>,
    Path((_device_id, interface_id)): Path<(Uuid, Uuid)>,
) -> AppResult<StatusCode> {
    state.db.delete_interface(interface_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

// --- IPs ---

pub async fn list_device_ips(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<DeviceIpView>>> {
    Ok(Json(state.db.list_device_ips(id).await?))
}
