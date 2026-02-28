//! Integration tests for the API. Require DATABASE_URL and a running Postgres.
//! Run with: `cargo test --test api -- --ignored`

use axum::body::Body;
use axum::http::Request;
use netweave;
use sqlx::postgres::PgPoolOptions;
use tower::{Service, ServiceExt};

#[tokio::test]
#[ignore = "requires DATABASE_URL and running Postgres"]
async fn check_oidc_returns_200_and_json() {
    dotenvy::dotenv().ok();
    let db_url = match std::env::var("DATABASE_URL") {
        Ok(u) => u,
        Err(_) => {
            eprintln!("SKIP: DATABASE_URL not set");
            return;
        }
    };

    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&db_url)
        .await
        .expect("connect to test DB");

    let state = netweave::create_state(pool, None)
        .await
        .expect("create_state");
    let app = netweave::create_app(state).await.expect("create_app");
    let mut service = app.into_service();

    let req = Request::get("http://localhost/auth/check-oidc")
        .body(Body::empty())
        .unwrap();
    let response = service.ready().await.unwrap().call(req).await.unwrap();

    assert_eq!(response.status(), 200, "GET /auth/check-oidc should return 200");
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(
        json.get("oidc_enabled").is_some(),
        "response should contain oidc_enabled"
    );
}
