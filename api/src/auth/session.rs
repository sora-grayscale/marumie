use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::StatusCode;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::crypto::encryption;
use crate::error::AppError;
use crate::AppState;

const SESSION_COOKIE_NAME: &str = "session_id";
const SESSION_DURATION_DAYS: i64 = 30;

#[derive(Clone)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    /// Decrypted DEK for this session. None if session was created without
    /// master_password (e.g. WebAuthn login before unlock).
    pub dek: Option<[u8; 32]>,
}

impl std::fmt::Debug for Session {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Session")
            .field("id", &self.id)
            .field("user_id", &self.user_id)
            .field("dek", &self.dek.as_ref().map(|_| "[REDACTED]"))
            .finish()
    }
}

impl Session {
    /// Get the DEK or return an error requiring the user to unlock.
    pub fn require_dek(&self) -> Result<&[u8; 32], AppError> {
        self.dek.as_ref().ok_or_else(|| {
            AppError::BadRequest(
                "Session not unlocked. Provide master_password via POST /api/auth/unlock"
                    .to_string(),
            )
        })
    }
}

/// Create a new session. If `dek` is provided, it is encrypted with `session_key`
/// and stored alongside the session for later retrieval.
pub async fn create_session(
    pool: &PgPool,
    user_id: Uuid,
    dek: Option<&[u8; 32]>,
    session_key: &[u8; 32],
) -> Result<Uuid, AppError> {
    let session_id = Uuid::new_v4();
    let expires_at = Utc::now() + Duration::days(SESSION_DURATION_DAYS);

    let encrypted_dek = match dek {
        Some(dek) => Some(encryption::encrypt(session_key, dek)?),
        None => None,
    };

    sqlx::query(
        "INSERT INTO sessions (id, user_id, expires_at, encrypted_dek) VALUES ($1, $2, $3, $4)",
    )
    .bind(session_id)
    .bind(user_id)
    .bind(expires_at)
    .bind(&encrypted_dek)
    .execute(pool)
    .await?;

    Ok(session_id)
}

/// Validate a session and return user_id + optional DEK.
pub async fn validate_session(
    pool: &PgPool,
    session_id: Uuid,
    session_key: &[u8; 32],
) -> Result<(Uuid, Option<[u8; 32]>), AppError> {
    let row: Option<(Uuid, Option<Vec<u8>>)> = sqlx::query_as(
        "SELECT user_id, encrypted_dek FROM sessions WHERE id = $1 AND expires_at > NOW()",
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    match row {
        Some((user_id, Some(encrypted_dek))) => {
            let dek_bytes = encryption::decrypt(session_key, &encrypted_dek)?;
            if dek_bytes.len() != 32 {
                return Err(AppError::Crypto("Invalid DEK size in session".to_string()));
            }
            let mut dek = [0u8; 32];
            dek.copy_from_slice(&dek_bytes);
            Ok((user_id, Some(dek)))
        }
        Some((user_id, None)) => Ok((user_id, None)),
        None => Err(AppError::Unauthorized),
    }
}

/// Store DEK in an existing session (for post-login unlock).
pub async fn unlock_session(
    pool: &PgPool,
    session_id: Uuid,
    dek: &[u8; 32],
    session_key: &[u8; 32],
) -> Result<(), AppError> {
    let encrypted_dek = encryption::encrypt(session_key, dek)?;
    sqlx::query("UPDATE sessions SET encrypted_dek = $1 WHERE id = $2")
        .bind(&encrypted_dek)
        .bind(session_id)
        .execute(pool)
        .await?;
    Ok(())
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
                    s.split('=')
                        .nth(1)
                        .and_then(|v| Uuid::parse_str(v.trim()).ok())
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

        let (user_id, dek) =
            validate_session(&state.pool, session_id, &state.session_key)
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
            dek,
        })
    }
}
