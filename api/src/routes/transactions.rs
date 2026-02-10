use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use uuid::Uuid;

use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::transaction::{CreateTransactionRequest, TransactionQuery, TransactionResponse};
use crate::services::transaction_service;
use crate::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardSummary {
    total_income: f64,
    total_expense: f64,
    balance: f64,
    savings: f64,
    monthly_data: Vec<MonthlyDataPoint>,
    assets: Vec<PortfolioItem>,
    liabilities: Vec<PortfolioItem>,
}

#[derive(Debug, Serialize)]
struct MonthlyDataPoint {
    month: String,
    income: f64,
    expense: f64,
    balance: f64,
}

#[derive(Debug, Serialize)]
struct PortfolioItem {
    name: String,
    value: f64,
    color: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/summary", get(get_summary))
        .route("/", get(list_transactions).post(create_transaction))
        .route("/{id}", get(get_transaction).delete(delete_transaction))
}

async fn get_summary(
    _session: Session,
) -> Json<DashboardSummary> {
    // E2EE: Server cannot aggregate encrypted amounts.
    // Return empty summary; client computes from decrypted transactions.
    Json(DashboardSummary {
        total_income: 0.0,
        total_expense: 0.0,
        balance: 0.0,
        savings: 0.0,
        monthly_data: vec![],
        assets: vec![],
        liabilities: vec![],
    })
}

async fn list_transactions(
    State(state): State<AppState>,
    session: Session,
    Query(query): Query<TransactionQuery>,
) -> Result<Json<Vec<TransactionResponse>>, AppError> {
    let dek = session.require_dek()?;
    let transactions =
        transaction_service::list_transactions(&state.pool, session.user_id, &query, dek).await?;
    Ok(Json(transactions))
}

async fn create_transaction(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<CreateTransactionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let dek = session.require_dek()?;
    let transaction =
        transaction_service::create_transaction(&state.pool, session.user_id, req, dek).await?;
    Ok((StatusCode::CREATED, Json(transaction)))
}

async fn get_transaction(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<Json<TransactionResponse>, AppError> {
    let dek = session.require_dek()?;
    let transaction =
        transaction_service::get_transaction(&state.pool, session.user_id, id, dek).await?;
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
