use crate::ui::{DetailProperty, DetailSection, FormField, FormSchema, TableView};
use askama::Template;
use axum::{
    http::StatusCode,
    response::{Html, IntoResponse},
};
use serde::Serialize;

// --- SHARED UI STRUCTURES ---

#[derive(Serialize, Clone)]
pub struct NavLink {
    pub label: String,
    pub url: String,
    pub active: bool,
}

impl NavLink {
    pub fn main_nav(active_key: &str, role: &str) -> Vec<Self> {
        let mut links = vec![NavLink {
            label: "Services".into(),
            url: "/".into(),
            active: active_key == "services",
        }];

        if role == "ADMIN" {
            links.push(NavLink {
                label: "Devices".into(),
                url: "/devices".into(),
                active: active_key == "devices",
            });
            links.push(NavLink {
                label: "Networks".into(),
                url: "/networks".into(),
                active: active_key == "networks",
            });
        }
        links
    }
}

pub fn get_nav(current_path: &str, role: &str) -> Vec<NavLink> {
    let key = if current_path.starts_with("/devices") {
        "devices"
    } else if current_path.starts_with("/networks") {
        "networks"
    } else {
        "services"
    };
    NavLink::main_nav(key, role)
}

// --- TEMPLATES ---

#[derive(Template)]
#[template(path = "generic_detail.html")]
pub struct GenericDetailTemplate {
    pub title: String,
    pub back_link: String,
    pub edit_link: Option<String>,
    pub properties: Vec<DetailProperty>,
    pub sections: Vec<DetailSection>,
}

#[derive(Template)]
#[template(path = "generic_list.html")]
pub struct GenericListTemplate {
    pub title: String,
    pub nav_links: Vec<NavLink>,
    pub table: TableView,
    pub add_link: Option<String>,
    pub add_button_label: String,
    pub empty_message: String,
    pub search_query: Option<String>,
    pub search_action: Option<String>,
}

#[derive(Template)]
#[template(path = "generic_form.html")]
pub struct GenericFormTemplate {
    pub title: String,
    pub action: String,
    pub back_link: String,
    pub fields: Vec<FormField>,
    pub error: Option<String>,
}

// --- HELPER WRAPPERS ---

pub struct HtmlTemplate<T>(pub T);

impl<T> IntoResponse for HtmlTemplate<T>
where
    T: Template,
{
    fn into_response(self) -> axum::response::Response {
        match self.0.render() {
            Ok(html) => Html(html).into_response(),
            Err(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to render template: {}", err),
            )
                .into_response(),
        }
    }
}

pub type AppResult<T> = Result<T, (StatusCode, String)>;

pub fn internal_error<E>(err: E) -> (StatusCode, String)
where
    E: std::fmt::Display,
{
    (StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
}

pub fn render_form<T: FormSchema>(back_link: &str) -> HtmlTemplate<GenericFormTemplate> {
    HtmlTemplate(GenericFormTemplate {
        title: T::form_title(),
        action: T::form_action(),
        back_link: back_link.to_string(),
        fields: T::form_fields(),
        error: None,
    })
}
