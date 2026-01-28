use super::common::{internal_error, json_response, AppResult};
use crate::models::{CreateDevicePayload, CreateInterfacePayload};
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
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
) -> AppResult<impl IntoResponse> {
    let devices = state
        .db
        .list_devices(params.q)
        .await
        .map_err(internal_error)?;

    json_response(devices)
}

pub async fn create_device(
    State(state): State<AppState>,
    Json(payload): Json<CreateDevicePayload>,
) -> AppResult<impl IntoResponse> {
    let device = state
        .db
        .create_device(payload)
        .await
        .map_err(internal_error)?;

    // In a real API we might return 201 Created with Location header,
    // for now returning the created object is fine.
    json_response(device)
}

pub async fn get_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let device = state
        .db
        .get_device(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(super::common::ErrorResponse {
                error: "Device not found".into(),
            }),
        ))?;

    // We might want to include interfaces/ips in the response or use a separate endpoint
    // For now returning the base device
    json_response(device)
}

pub async fn update_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateDevicePayload>, // TODO: Should use UpdateDevicePayload if different
) -> AppResult<impl IntoResponse> {
    let device = state
        .db
        .update_device(id, payload)
        .await
        .map_err(internal_error)?;

    json_response(device)
}

pub async fn delete_device(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_device(id).await.map_err(internal_error)?;
    Ok(StatusCode::NO_CONTENT)
}

// --- Interfaces ---

pub async fn create_interface(
    State(state): State<AppState>,
    Path(device_id): Path<Uuid>,
    Json(payload): Json<CreateInterfacePayload>,
) -> AppResult<impl IntoResponse> {
    let iface = state
        .db
        .create_interface(device_id, payload)
        .await
        .map_err(internal_error)?;

    json_response(iface)
}

pub async fn delete_interface(
    State(state): State<AppState>,
    Path((_device_id, interface_id)): Path<(Uuid, Uuid)>,
) -> AppResult<impl IntoResponse> {
    state
        .db
        .delete_interface(interface_id)
        .await
        .map_err(internal_error)?;
    Ok(StatusCode::NO_CONTENT)
}

// --- IPs ---

pub async fn list_device_ips(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let ips = state.db.list_device_ips(id).await.map_err(internal_error)?;
    json_response(ips)
}

// Reuse logic from common handlers/ips.rs if possible, or define here
