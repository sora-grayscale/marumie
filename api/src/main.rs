use axum::Router;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use http::header::{AUTHORIZATION, CONTENT_TYPE, COOKIE};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod crypto;
mod csv;
mod db;
mod models;
mod routes;
mod services;

pub mod error;

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
    pub webauthn: std::sync::Arc<webauthn_rs::Webauthn>,
    /// Server-side key for encrypting DEK in session storage (defense-in-depth).
    pub session_key: [u8; 32],
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "mirai_kojin_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    // Create initial user from environment variables (if no users exist)
    if let Err(e) = services::auth_service::create_initial_user(&pool).await {
        tracing::warn!("Failed to create initial user: {}", e);
    }

    // Session encryption key: protects DEK stored in session table.
    // If not set, generates an ephemeral key (sessions won't survive restarts).
    let session_key: [u8; 32] = {
        let key_hex = std::env::var("SESSION_ENCRYPTION_KEY").unwrap_or_else(|_| {
            tracing::warn!(
                "SESSION_ENCRYPTION_KEY not set — generating ephemeral key. \
                 Active sessions will be invalidated on restart."
            );
            let mut key = [0u8; 32];
            rand::RngCore::fill_bytes(&mut rand::rngs::OsRng, &mut key);
            hex::encode(key)
        });
        let key_bytes = hex::decode(&key_hex)
            .expect("SESSION_ENCRYPTION_KEY must be valid hex (64 hex chars = 32 bytes)");
        assert!(
            key_bytes.len() == 32,
            "SESSION_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)"
        );
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        key
    };

    let rp_id = std::env::var("WEBAUTHN_RP_ID").unwrap_or_else(|_| "localhost".to_string());
    let rp_origin = std::env::var("WEBAUTHN_RP_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    let rp_origin_url = url::Url::parse(&rp_origin)?;

    let webauthn = webauthn_rs::WebauthnBuilder::new(&rp_id, &rp_origin_url)?
        .rp_name("mirai-kojin")
        .build()?;

    let state = AppState {
        pool,
        webauthn: std::sync::Arc::new(webauthn),
        session_key,
    };

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3000".parse().unwrap(),
            "http://localhost:3001".parse().unwrap(),
        ])
        .allow_methods([
            http::Method::GET,
            http::Method::POST,
            http::Method::PUT,
            http::Method::DELETE,
            http::Method::OPTIONS,
        ])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE, COOKIE])
        .allow_credentials(true);

    let app = Router::new()
        .nest("/api/auth", routes::auth::router())
        .nest("/api/transactions", routes::transactions::router())
        .nest("/api/accounts", routes::accounts::router())
        .nest("/api/budgets", routes::budgets::router())
        .nest("/api/csv", routes::csv_import::router())
        .nest("/api/import", routes::csv_import::router())
        .nest("/api/backup", routes::backup::router())
        .nest("/api/admin", routes::admin::router())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
