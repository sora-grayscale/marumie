use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use uuid::Uuid;

use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::account::{AccountResponse, CreateAccountRequest, UpdateAccountRequest};
use crate::services::account_service;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_accounts).post(create_account))
        .route(
            "/{id}",
            get(get_account).put(update_account).delete(delete_account),
        )
}

async fn list_accounts(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<Vec<AccountResponse>>, AppError> {
    let accounts = account_service::list_accounts(&state.pool, session.user_id).await?;
    Ok(Json(accounts))
}

async fn create_account(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<CreateAccountRequest>,
) -> Result<impl IntoResponse, AppError> {
    let account = account_service::create_account(&state.pool, session.user_id, req).await?;
    Ok((StatusCode::CREATED, Json(account)))
}

async fn get_account(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<Json<AccountResponse>, AppError> {
    let account = account_service::get_account(&state.pool, session.user_id, id).await?;
    Ok(Json(account))
}

async fn update_account(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAccountRequest>,
) -> Result<Json<AccountResponse>, AppError> {
    let account = account_service::update_account(&state.pool, session.user_id, id, req).await?;
    Ok(Json(account))
}

async fn delete_account(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    account_service::delete_account(&state.pool, session.user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
