use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::budget::{Budget, BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest};

pub async fn list_budgets(pool: &PgPool, user_id: Uuid) -> Result<Vec<BudgetResponse>, AppError> {
    let budgets: Vec<Budget> = sqlx::query_as(
        "SELECT * FROM budgets WHERE user_id = $1 ORDER BY year DESC, month DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(budgets
        .into_iter()
        .map(|b| BudgetResponse {
            id: b.id,
            category: b.category,
            amount: base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                &b.amount_encrypted,
            ),
            year: b.year,
            month: b.month,
            created_at: b.created_at,
        })
        .collect())
}

pub async fn create_budget(
    pool: &PgPool,
    user_id: Uuid,
    req: CreateBudgetRequest,
) -> Result<BudgetResponse, AppError> {
    let id = Uuid::new_v4();
    let amount_bytes = req.amount.as_bytes().to_vec();

    let budget: Budget = sqlx::query_as(
        "INSERT INTO budgets (id, user_id, category, amount_encrypted, year, month)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *",
    )
    .bind(id)
    .bind(user_id)
    .bind(&req.category)
    .bind(&amount_bytes)
    .bind(req.year)
    .bind(req.month)
    .fetch_one(pool)
    .await?;

    Ok(BudgetResponse {
        id: budget.id,
        category: budget.category,
        amount: req.amount,
        year: budget.year,
        month: budget.month,
        created_at: budget.created_at,
    })
}

pub async fn get_budget(
    pool: &PgPool,
    user_id: Uuid,
    id: Uuid,
) -> Result<BudgetResponse, AppError> {
    let budget: Budget = sqlx::query_as(
        "SELECT * FROM budgets WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Budget not found".to_string()))?;

    Ok(BudgetResponse {
        id: budget.id,
        category: budget.category,
        amount: base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &budget.amount_encrypted,
        ),
        year: budget.year,
        month: budget.month,
        created_at: budget.created_at,
    })
}

pub async fn update_budget(
    pool: &PgPool,
    user_id: Uuid,
    id: Uuid,
    req: UpdateBudgetRequest,
) -> Result<BudgetResponse, AppError> {
    let current: Budget = sqlx::query_as(
        "SELECT * FROM budgets WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Budget not found".to_string()))?;

    let category = req.category.unwrap_or(current.category);
    let amount_bytes = req
        .amount
        .map(|a| a.as_bytes().to_vec())
        .unwrap_or(current.amount_encrypted);

    let budget: Budget = sqlx::query_as(
        "UPDATE budgets SET category = $1, amount_encrypted = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING *",
    )
    .bind(&category)
    .bind(&amount_bytes)
    .bind(id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(BudgetResponse {
        id: budget.id,
        category: budget.category,
        amount: base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &budget.amount_encrypted,
        ),
        year: budget.year,
        month: budget.month,
        created_at: budget.created_at,
    })
}

pub async fn delete_budget(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM budgets WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Budget not found".to_string()));
    }

    Ok(())
}
