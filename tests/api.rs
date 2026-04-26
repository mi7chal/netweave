//! Integration tests for the API. Require DATABASE_URL and a running Postgres.
//! Run with: `cargo test --test api -- --ignored`

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use netweave::config::Config;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tokio::sync::Mutex;
use tower::{Service, ServiceExt};

static ENV_LOCK: Mutex<()> = Mutex::const_new(());

async fn app_service(
) -> tower::util::BoxCloneService<Request<Body>, axum::response::Response, std::convert::Infallible>
{
    dotenvy::dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set for integration tests");

    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&db_url)
        .await
        .expect("connect to test DB");

    let config = Config::from_env().expect("load config");
    let state = netweave::create_state(config, pool, None)
        .await
        .expect("create_state");
    netweave::create_app(state)
        .await
        .expect("create_app")
        .into_service()
        .boxed_clone()
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&body).expect("response JSON")
}

fn session_cookie(response: &axum::response::Response) -> String {
    let raw = response
        .headers()
        .get(header::SET_COOKIE)
        .expect("response should set session cookie")
        .to_str()
        .expect("cookie must be utf-8");
    raw.split(';')
        .next()
        .expect("cookie should contain key=value")
        .to_string()
}

async fn login(
    service: &mut tower::util::BoxCloneService<
        Request<Body>,
        axum::response::Response,
        std::convert::Infallible,
    >,
    username: &str,
    password: &str,
) -> String {
    let req = Request::post("http://localhost/api/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "username": username,
                "password": password
            })
            .to_string(),
        ))
        .expect("build login request");
    let response = service
        .ready()
        .await
        .expect("service ready")
        .call(req)
        .await
        .expect("login call");
    assert_eq!(response.status(), StatusCode::OK);
    session_cookie(&response)
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and running Postgres"]
async fn unauthenticated_protected_route_returns_401() {
    let _guard = ENV_LOCK.lock().await;
    let mut service = app_service().await;

    let req = Request::get("http://localhost/api/services")
        .body(Body::empty())
        .expect("build request");
    let response = service.ready().await.unwrap().call(req).await.unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and running Postgres"]
async fn public_settings_returns_only_public_keys() {
    let _guard = ENV_LOCK.lock().await;
    let mut service = app_service().await;

    let req = Request::get("http://localhost/api/settings/public")
        .body(Body::empty())
        .expect("build request");
    let response = service.ready().await.unwrap().call(req).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = response_json(response).await;
    let object = json
        .as_object()
        .expect("public settings response should be an object");

    assert!(
        !object.contains_key("oidc_auto_import"),
        "non-public settings must not be exposed"
    );
    assert!(
        object.keys().all(|k| k == "homepage_public"),
        "only homepage_public should be returned"
    );
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and running Postgres"]
async fn admin_can_update_settings_via_authenticated_flow() {
    let _guard = ENV_LOCK.lock().await;
    env::set_var("DEFAULT_ADMIN_USER", "integration-admin");
    env::set_var("DEFAULT_ADMIN_PASSWORD", "integration-admin-password");
    let mut service = app_service().await;

    let cookie = login(
        &mut service,
        "integration-admin",
        "integration-admin-password",
    )
    .await;

    let update_req = Request::put("http://localhost/api/settings")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, cookie)
        .body(Body::from(json!({ "homepage_public": true }).to_string()))
        .expect("build update request");
    let update_resp = service
        .ready()
        .await
        .expect("service ready")
        .call(update_req)
        .await
        .expect("settings update call");

    assert_eq!(update_resp.status(), StatusCode::OK);
    let updated_json = response_json(update_resp).await;
    assert_eq!(
        updated_json.get("homepage_public"),
        Some(&Value::String("true".to_string()))
    );
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and running Postgres"]
async fn authenticated_me_returns_logged_in_user() {
    let _guard = ENV_LOCK.lock().await;
    env::set_var("DEFAULT_ADMIN_USER", "integration-admin");
    env::set_var("DEFAULT_ADMIN_PASSWORD", "integration-admin-password");
    let mut service = app_service().await;

    let cookie = login(
        &mut service,
        "integration-admin",
        "integration-admin-password",
    )
    .await;

    let me_req = Request::get("http://localhost/api/auth/me")
        .header(header::COOKIE, cookie)
        .body(Body::empty())
        .expect("build me request");
    let me_resp = service
        .ready()
        .await
        .expect("service ready")
        .call(me_req)
        .await
        .expect("me call");

    assert_eq!(me_resp.status(), StatusCode::OK);
    let me_json = response_json(me_resp).await;
    assert_eq!(
        me_json.get("username"),
        Some(&Value::String("integration-admin".to_string()))
    );
    assert_eq!(
        me_json.get("role"),
        Some(&Value::String("ADMIN".to_string()))
    );
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and running Postgres"]
async fn me_without_session_returns_401() {
    let _guard = ENV_LOCK.lock().await;
    let mut service = app_service().await;

    let me_req = Request::get("http://localhost/api/auth/me")
        .body(Body::empty())
        .expect("build me request");
    let me_resp = service
        .ready()
        .await
        .expect("service ready")
        .call(me_req)
        .await
        .expect("me call");

    assert_eq!(me_resp.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and running Postgres"]
async fn viewer_user_is_forbidden_from_admin_routes() {
    let _guard = ENV_LOCK.lock().await;
    env::set_var("DEFAULT_ADMIN_USER", "integration-admin");
    env::set_var("DEFAULT_ADMIN_PASSWORD", "integration-admin-password");
    let mut service = app_service().await;

    let admin_cookie = login(
        &mut service,
        "integration-admin",
        "integration-admin-password",
    )
    .await;

    let create_viewer_req = Request::post("http://localhost/api/users")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, admin_cookie)
        .body(Body::from(
            json!({
                "username": "integration-viewer",
                "email": "integration-viewer@example.com",
                "role": "VIEWER",
                "password": "integration-viewer-password",
                "is_active": true
            })
            .to_string(),
        ))
        .expect("build create viewer request");
    let create_viewer_resp = service
        .ready()
        .await
        .expect("service ready")
        .call(create_viewer_req)
        .await
        .expect("create viewer call");
    assert_eq!(create_viewer_resp.status(), StatusCode::OK);

    let viewer_cookie = login(
        &mut service,
        "integration-viewer",
        "integration-viewer-password",
    )
    .await;

    let forbidden_req = Request::get("http://localhost/api/settings")
        .header(header::COOKIE, viewer_cookie)
        .body(Body::empty())
        .expect("build forbidden route request");
    let forbidden_resp = service
        .ready()
        .await
        .expect("service ready")
        .call(forbidden_req)
        .await
        .expect("forbidden route call");

    assert_eq!(forbidden_resp.status(), StatusCode::FORBIDDEN);
}
