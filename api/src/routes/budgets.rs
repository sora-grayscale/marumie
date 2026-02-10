use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use uuid::Uuid;

use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::budget::{BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest};
use crate::services::budget_service;
use crate::AppState;

#[derive(Debug, Serialize)]
struct BudgetSummaryResponse {
    category: String,
    budgeted: f64,
    spent: f64,
    remaining: f64,
    percentage: f64,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/summary", get(get_budget_summary))
        .route("/", get(list_budgets).post(create_budget))
        .route(
            "/{id}",
            get(get_budget).put(update_budget).delete(delete_budget),
        )
}

async fn get_budget_summary(
    _session: Session,
) -> Json<Vec<BudgetSummaryResponse>> {
    // E2EE: Server cannot aggregate encrypted budget amounts.
    // Return empty list; client computes from decrypted data.
    Json(vec![])
}

async fn list_budgets(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<Vec<BudgetResponse>>, AppError> {
    let dek = session.require_dek()?;
    let budgets = budget_service::list_budgets(&state.pool, session.user_id, dek).await?;
    Ok(Json(budgets))
}

async fn create_budget(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<CreateBudgetRequest>,
) -> Result<impl IntoResponse, AppError> {
    let dek = session.require_dek()?;
    let budget = budget_service::create_budget(&state.pool, session.user_id, req, dek).await?;
    Ok((StatusCode::CREATED, Json(budget)))
}

async fn get_budget(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<Json<BudgetResponse>, AppError> {
    let dek = session.require_dek()?;
    let budget = budget_service::get_budget(&state.pool, session.user_id, id, dek).await?;
    Ok(Json(budget))
}

async fn update_budget(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateBudgetRequest>,
) -> Result<Json<BudgetResponse>, AppError> {
    let dek = session.require_dek()?;
    let budget = budget_service::update_budget(&state.pool, session.user_id, id, req, dek).await?;
    Ok(Json(budget))
}

async fn delete_budget(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    budget_service::delete_budget(&state.pool, session.user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
