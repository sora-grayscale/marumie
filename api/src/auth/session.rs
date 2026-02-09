use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::StatusCode;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::AppState;

const SESSION_COOKIE_NAME: &str = "session_id";
const SESSION_DURATION_DAYS: i64 = 30;

#[derive(Debug, Clone)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
}

/// Create a new session for a user. Returns session ID.
pub async fn create_session(pool: &PgPool, user_id: Uuid) -> Result<Uuid, AppError> {
    let session_id = Uuid::new_v4();
    let expires_at = Utc::now() + Duration::days(SESSION_DURATION_DAYS);

    sqlx::query(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(session_id)
    .bind(user_id)
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok(session_id)
}

/// Validate a session and return the user ID if valid.
pub async fn validate_session(pool: &PgPool, session_id: Uuid) -> Result<Uuid, AppError> {
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()",
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    match row {
        Some((user_id,)) => Ok(user_id),
        None => Err(AppError::Unauthorized),
    }
}

/// Delete a session (logout).
pub async fn delete_session(pool: &PgPool, session_id: Uuid) -> Result<(), AppError> {
    sqlx::query("DELETE FROM sessions WHERE id = $1")
        .bind(session_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Extract session from request cookies.
impl FromRequestParts<AppState> for Session {
    type Rejection = (StatusCode, axum::Json<serde_json::Value>);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let cookie_header = parts
            .headers
            .get(axum::http::header::COOKIE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        let session_id = cookie_header
            .split(';')
            .filter_map(|s| {
                let s = s.trim();
                if s.starts_with(SESSION_COOKIE_NAME) {
                    s.split('=').nth(1).and_then(|v| Uuid::parse_str(v.trim()).ok())
                } else {
                    None
                }
            })
            .next();

        let session_id = session_id.ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({"error": "No session cookie"})),
            )
        })?;

        let user_id = validate_session(&state.pool, session_id)
            .await
            .map_err(|_| {
                (
                    StatusCode::UNAUTHORIZED,
                    axum::Json(serde_json::json!({"error": "Invalid or expired session"})),
                )
            })?;

        Ok(Session {
            id: session_id,
            user_id,
        })
    }
}
