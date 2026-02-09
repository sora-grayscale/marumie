use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use uuid::Uuid;

use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::transaction::{CreateTransactionRequest, TransactionQuery, TransactionResponse};
use crate::services::transaction_service;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_transactions).post(create_transaction))
        .route("/{id}", get(get_transaction).delete(delete_transaction))
}

async fn list_transactions(
    State(state): State<AppState>,
    session: Session,
    Query(query): Query<TransactionQuery>,
) -> Result<Json<Vec<TransactionResponse>>, AppError> {
    let transactions =
        transaction_service::list_transactions(&state.pool, session.user_id, &query).await?;
    Ok(Json(transactions))
}

async fn create_transaction(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<CreateTransactionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let transaction =
        transaction_service::create_transaction(&state.pool, session.user_id, req).await?;
    Ok((StatusCode::CREATED, Json(transaction)))
}

async fn get_transaction(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<Json<TransactionResponse>, AppError> {
    let transaction =
        transaction_service::get_transaction(&state.pool, session.user_id, id).await?;
    Ok(Json(transaction))
}

async fn delete_transaction(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    transaction_service::delete_transaction(&state.pool, session.user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
