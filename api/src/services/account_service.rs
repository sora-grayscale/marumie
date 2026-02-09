use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::account::{
    Account, AccountResponse, CreateAccountRequest, UpdateAccountRequest,
};

pub async fn list_accounts(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<AccountResponse>, AppError> {
    let accounts: Vec<Account> = sqlx::query_as(
        "SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(accounts.into_iter().map(AccountResponse::from).collect())
}

pub async fn create_account(
    pool: &PgPool,
    user_id: Uuid,
    req: CreateAccountRequest,
) -> Result<AccountResponse, AppError> {
    let id = Uuid::new_v4();

    let account: Account = sqlx::query_as(
        "INSERT INTO accounts (id, user_id, name, account_type, institution, currency)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *",
    )
    .bind(id)
    .bind(user_id)
    .bind(&req.name)
    .bind(&req.account_type)
    .bind(&req.institution)
    .bind(&req.currency)
    .fetch_one(pool)
    .await?;

    Ok(AccountResponse::from(account))
}

pub async fn get_account(
    pool: &PgPool,
    user_id: Uuid,
    id: Uuid,
) -> Result<AccountResponse, AppError> {
    let account: Account = sqlx::query_as(
        "SELECT * FROM accounts WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Account not found".to_string()))?;

    Ok(AccountResponse::from(account))
}

pub async fn update_account(
    pool: &PgPool,
    user_id: Uuid,
    id: Uuid,
    req: UpdateAccountRequest,
) -> Result<AccountResponse, AppError> {
    let current = get_account(pool, user_id, id).await?;

    let name = req.name.unwrap_or(current.name);
    let account_type = req.account_type.unwrap_or(current.account_type);
    let institution = req.institution.unwrap_or(current.institution);
    let is_active = req.is_active.unwrap_or(current.is_active);

    let account: Account = sqlx::query_as(
        "UPDATE accounts SET name = $1, account_type = $2, institution = $3, is_active = $4, updated_at = NOW()
         WHERE id = $5 AND user_id = $6
         RETURNING *",
    )
    .bind(&name)
    .bind(&account_type)
    .bind(&institution)
    .bind(is_active)
    .bind(id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(AccountResponse::from(account))
}

pub async fn delete_account(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM accounts WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Account not found".to_string()));
    }

    Ok(())
}
