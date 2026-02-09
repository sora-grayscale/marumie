use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use uuid::Uuid;

use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::user::UserResponse;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users))
        .route("/users/{id}", get(get_user).delete(delete_user))
}

async fn list_users(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<Vec<UserResponse>>, AppError> {
    require_owner(&state.pool, session.user_id).await?;

    let users: Vec<crate::models::user::User> =
        sqlx::query_as("SELECT * FROM users ORDER BY created_at DESC")
            .fetch_all(&state.pool)
            .await?;

    let responses: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();
    Ok(Json(responses))
}

async fn get_user(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<Json<UserResponse>, AppError> {
    require_owner(&state.pool, session.user_id).await?;

    let user: crate::models::user::User =
        sqlx::query_as("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(Json(UserResponse::from(user)))
}

async fn delete_user(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    require_owner(&state.pool, session.user_id).await?;

    if id == session.user_id {
        return Err(AppError::BadRequest("Cannot delete yourself".to_string()));
    }

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

async fn require_owner(pool: &sqlx::PgPool, user_id: Uuid) -> Result<(), AppError> {
    let role: Option<String> =
        sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?;

    match role.as_deref() {
        Some("owner") => Ok(()),
        _ => Err(AppError::Forbidden),
    }
}
