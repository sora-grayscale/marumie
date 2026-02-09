use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::auth::session::Session;
use crate::error::AppError;
use crate::services::csv_service;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/detect", post(detect_institution))
        .route("/preview", post(preview_csv))
        .route("/import", post(import_csv))
}

#[derive(Debug, Deserialize)]
pub struct CsvUpload {
    pub csv_data: String,
    pub account_id: Option<Uuid>,
}

async fn detect_institution(
    _session: Session,
    Json(body): Json<CsvUpload>,
) -> Result<Json<serde_json::Value>, AppError> {
    let institution = csv_service::detect_institution(&body.csv_data)?;
    Ok(Json(serde_json::json!({
        "institution": institution,
    })))
}

async fn preview_csv(
    _session: Session,
    Json(body): Json<CsvUpload>,
) -> Result<Json<serde_json::Value>, AppError> {
    let records = csv_service::parse_csv(&body.csv_data)?;
    Ok(Json(serde_json::json!({
        "records": records,
        "count": records.len(),
    })))
}

async fn import_csv(
    State(state): State<AppState>,
    session: Session,
    Json(body): Json<CsvUpload>,
) -> Result<impl IntoResponse, AppError> {
    let account_id = body
        .account_id
        .ok_or_else(|| AppError::BadRequest("account_id required for import".to_string()))?;

    let count =
        csv_service::import_csv(&state.pool, session.user_id, account_id, &body.csv_data).await?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "imported_count": count,
        })),
    ))
}
