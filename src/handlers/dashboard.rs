use crate::AppState;
use crate::auth::AuthUser;
use crate::ui::TableView;
use axum::{
    extract::{Extension, State},
    response::IntoResponse,
};

use super::common::{AppResult, GenericListTemplate, HtmlTemplate, get_nav, internal_error};

pub async fn show_dashboard(
    State(state): State<AppState>,
    Extension(user): Extension<AuthUser>,
) -> AppResult<impl IntoResponse> {
    let services = state
        .db
        .list_dashboard_services()
        .await
        .map_err(internal_error)?;

    let table = TableView::from_display(services);

    Ok(HtmlTemplate(GenericListTemplate {
        title: "Dashboard".into(),
        nav_links: get_nav("/", &user.role),
        table,
        add_link: if user.role == "ADMIN" {
            Some("/services/new".into())
        } else {
            None
        },
        add_button_label: "Add Service".into(),
        empty_message: "No services found.".into(),
        search_query: None,
        search_action: None,
    }))
}
