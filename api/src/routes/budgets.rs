use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use uuid::Uuid;

use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::budget::{BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest};
use crate::services::budget_service;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_budgets).post(create_budget))
        .route(
            "/{id}",
            get(get_budget).put(update_budget).delete(delete_budget),
        )
}

async fn list_budgets(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<Vec<BudgetResponse>>, AppError> {
    let budgets = budget_service::list_budgets(&state.pool, session.user_id).await?;
    Ok(Json(budgets))
}

async fn create_budget(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<CreateBudgetRequest>,
) -> Result<impl IntoResponse, AppError> {
    let budget = budget_service::create_budget(&state.pool, session.user_id, req).await?;
    Ok((StatusCode::CREATED, Json(budget)))
}

async fn get_budget(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
) -> Result<Json<BudgetResponse>, AppError> {
    let budget = budget_service::get_budget(&state.pool, session.user_id, id).await?;
    Ok(Json(budget))
}

async fn update_budget(
    State(state): State<AppState>,
    session: Session,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateBudgetRequest>,
) -> Result<Json<BudgetResponse>, AppError> {
    let budget = budget_service::update_budget(&state.pool, session.user_id, id, req).await?;
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
