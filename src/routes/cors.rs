use tower_http::cors::{AllowOrigin, CorsLayer};

/// Builds CORS layer from configured origins.
pub(super) fn build_cors_layer(allowed_origins: &[String]) -> CorsLayer {
    use axum::http::{header, Method};

    let methods = vec![
        Method::GET,
        Method::POST,
        Method::PUT,
        Method::DELETE,
        Method::OPTIONS,
    ];
    let headers = vec![header::CONTENT_TYPE, header::AUTHORIZATION, header::COOKIE];

    if allowed_origins.is_empty() {
        CorsLayer::new()
            .allow_methods(methods)
            .allow_headers(headers)
    } else {
        let origins: Vec<axum::http::HeaderValue> = allowed_origins
            .iter()
            .filter_map(|origin| origin.trim().parse().ok())
            .collect();

        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods(methods)
            .allow_headers(headers)
            .allow_credentials(true)
    }
}
