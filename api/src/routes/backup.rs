use axum::extract::State;
use axum::routing::{get, post};
use axum::{Json, Router};

use crate::auth::session::Session;
use crate::error::AppError;
use crate::services::backup_service;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/export", get(export_data))
        .route("/recovery/verify", post(verify_recovery_key))
        .route("/recovery/restore", post(restore_with_recovery))
}

async fn export_data(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<serde_json::Value>, AppError> {
    let data = backup_service::export_user_data(&state.pool, session.user_id).await?;
    Ok(Json(data))
}

#[derive(serde::Deserialize)]
struct RecoveryKeyRequest {
    recovery_key: String,
    new_master_password: Option<String>,
}

async fn verify_recovery_key(
    State(state): State<AppState>,
    session: Session,
    Json(body): Json<RecoveryKeyRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    backup_service::verify_recovery_key(&state.pool, session.user_id, &body.recovery_key).await?;
    Ok(Json(serde_json::json!({"valid": true})))
}

async fn restore_with_recovery(
    State(state): State<AppState>,
    session: Session,
    Json(body): Json<RecoveryKeyRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let new_password = body
        .new_master_password
        .as_deref()
        .ok_or_else(|| AppError::BadRequest("new_master_password required".to_string()))?;

    backup_service::restore_with_recovery(
        &state.pool,
        session.user_id,
        &body.recovery_key,
        new_password,
    )
    .await?;

    Ok(Json(serde_json::json!({"restored": true})))
}
