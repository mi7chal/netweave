use crate::AppState;
use crate::models::CreateServicePayload;
use crate::ui::FormSchema;
use axum::{
    Form,
    extract::{Path, State},
    response::{IntoResponse, Redirect},
};

use super::common::{AppResult, GenericFormTemplate, HtmlTemplate, internal_error, render_form};

/// Show the form to add a new service
pub async fn show_add_service_form(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let devices = state.db.list_devices(None).await.map_err(internal_error)?;
    let device_options = devices
        .into_iter()
        .map(|d| (d.id.to_string(), d.hostname))
        .collect::<Vec<_>>();

    let mut template = render_form::<CreateServicePayload>("/");

    // inject device options
    if let Some(field) = template.0.fields.iter_mut().find(|f| f.name == "device_id") {
        field.options = device_options
            .into_iter()
            .map(|(v, l)| crate::ui::SelectOption {
                value: v,
                label: l,
                selected: false,
            })
            .collect();
    }

    Ok(template)
}

/// Handle the submission of the new service form
pub async fn create_service(
    State(state): State<AppState>,
    Form(payload): Form<CreateServicePayload>,
) -> AppResult<impl IntoResponse> {
    state
        .db
        .create_service(payload)
        .await
        .map_err(internal_error)?;
    Ok(Redirect::to("/"))
}

/// Deletes service
pub async fn delete_service(
    State(state): State<AppState>,
    Path(id): Path<uuid::Uuid>,
) -> AppResult<impl IntoResponse> {
    state.db.delete_service(id).await.map_err(internal_error)?;
    Ok(())
}

/// Show the form to edit an existing service
pub async fn show_edit_service_form(
    State(state): State<AppState>,
    Path(id): Path<uuid::Uuid>,
) -> AppResult<impl IntoResponse> {
    let service = state
        .db
        .get_service(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            "Service not found".into(),
        ))?;

    let devices = state.db.list_devices(None).await.map_err(internal_error)?;
    let device_options = devices
        .into_iter()
        .map(|d| (d.id.to_string(), d.hostname))
        .collect::<Vec<_>>();

    let mut fields = CreateServicePayload::form_fields();
    for field in &mut fields {
        match field.name.as_str() {
            "name" => field.value = Some(service.name.clone()),
            "base_url" => field.value = Some(service.base_url.clone()),
            "device_id" => {
                field.options = device_options
                    .iter()
                    .map(|(v, l)| crate::ui::SelectOption {
                        value: v.clone(),
                        label: l.clone(),
                        selected: service.device_id.map(|d| d.to_string()) == Some(v.clone()),
                    })
                    .collect();
            }
            "is_public" => field.checked = service.is_public.unwrap_or(false),
            _ => {}
        }
    }

    Ok(HtmlTemplate(GenericFormTemplate {
        title: format!("Edit {}", service.name),
        action: format!("/services/{}/edit", id),
        back_link: "/".into(),
        fields,
        error: None,
    }))
}

/// Handle the submission of the edit service form
pub async fn update_service(
    State(state): State<AppState>,
    Path(id): Path<uuid::Uuid>,
    Form(payload): Form<CreateServicePayload>,
) -> AppResult<impl IntoResponse> {
    state
        .db
        .update_service(id, payload)
        .await
        .map_err(internal_error)?;
    Ok(Redirect::to("/"))
}
