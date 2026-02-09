use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::transaction::{
    CreateTransactionRequest, Transaction, TransactionQuery, TransactionResponse,
};

/// List transactions for a user with optional filters.
pub async fn list_transactions(
    pool: &PgPool,
    user_id: Uuid,
    query: &TransactionQuery,
) -> Result<Vec<TransactionResponse>, AppError> {
    let limit = query.limit.unwrap_or(100).min(1000);
    let offset = query.offset.unwrap_or(0);

    let mut sql = String::from(
        "SELECT * FROM transactions WHERE user_id = $1",
    );
    let mut param_idx = 2u32;

    if query.account_id.is_some() {
        sql.push_str(&format!(" AND account_id = ${}", param_idx));
        param_idx += 1;
    }
    if query.from_date.is_some() {
        sql.push_str(&format!(" AND date >= ${}", param_idx));
        param_idx += 1;
    }
    if query.to_date.is_some() {
        sql.push_str(&format!(" AND date <= ${}", param_idx));
        param_idx += 1;
    }
    if query.transaction_type.is_some() {
        sql.push_str(&format!(" AND transaction_type = ${}", param_idx));
        param_idx += 1;
    }

    sql.push_str(&format!(
        " ORDER BY date DESC LIMIT ${} OFFSET ${}",
        param_idx,
        param_idx + 1
    ));

    // Build the query dynamically
    let mut q = sqlx::query_as::<_, Transaction>(&sql).bind(user_id);

    if let Some(ref account_id) = query.account_id {
        q = q.bind(account_id);
    }
    if let Some(ref from_date) = query.from_date {
        q = q.bind(from_date);
    }
    if let Some(ref to_date) = query.to_date {
        q = q.bind(to_date);
    }
    if let Some(ref transaction_type) = query.transaction_type {
        q = q.bind(transaction_type);
    }

    let transactions: Vec<Transaction> = q.bind(limit).bind(offset).fetch_all(pool).await?;

    // Note: In production, decryption would use the user's DEK.
    // For now, return encrypted data as-is (base64).
    let responses: Vec<TransactionResponse> = transactions
        .into_iter()
        .map(|t| TransactionResponse {
            id: t.id,
            account_id: t.account_id,
            date: t.date,
            transaction_type: t.transaction_type,
            amount: base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                &t.amount_encrypted,
            ),
            description: base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                &t.description_encrypted,
            ),
            category: t.category_encrypted.map(|c| {
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &c)
            }),
            subcategory: t.subcategory_encrypted.map(|c| {
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &c)
            }),
            memo: t.memo_encrypted.map(|m| {
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &m)
            }),
            payment_method: t.payment_method_encrypted.map(|p| {
                base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &p)
            }),
            created_at: t.created_at,
        })
        .collect();

    Ok(responses)
}

/// Create a new transaction (stores encrypted).
pub async fn create_transaction(
    pool: &PgPool,
    user_id: Uuid,
    req: CreateTransactionRequest,
) -> Result<TransactionResponse, AppError> {
    let id = Uuid::new_v4();

    // Generate a dedup hash from date + amount + description
    let hash = generate_hash(&req.date.to_string(), &req.amount, &req.description);

    // Check for duplicates
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM transactions WHERE user_id = $1 AND hash = $2",
    )
    .bind(user_id)
    .bind(&hash)
    .fetch_optional(pool)
    .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Duplicate transaction detected".to_string()));
    }

    // For now, store amount/description as raw bytes (in production, encrypt with DEK)
    let amount_bytes = req.amount.as_bytes().to_vec();
    let description_bytes = req.description.as_bytes().to_vec();
    let category_bytes = req.category.as_ref().map(|c| c.as_bytes().to_vec());
    let subcategory_bytes = req.subcategory.as_ref().map(|c| c.as_bytes().to_vec());
    let memo_bytes = req.memo.as_ref().map(|m| m.as_bytes().to_vec());
    let payment_method_bytes = req.payment_method.as_ref().map(|p| p.as_bytes().to_vec());

    let txn: Transaction = sqlx::query_as(
        "INSERT INTO transactions
         (id, account_id, user_id, date, transaction_type, amount_encrypted, description_encrypted,
          category_encrypted, subcategory_encrypted, memo_encrypted, payment_method_encrypted, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *",
    )
    .bind(id)
    .bind(req.account_id)
    .bind(user_id)
    .bind(req.date)
    .bind(&req.transaction_type)
    .bind(&amount_bytes)
    .bind(&description_bytes)
    .bind(&category_bytes)
    .bind(&subcategory_bytes)
    .bind(&memo_bytes)
    .bind(&payment_method_bytes)
    .bind(&hash)
    .fetch_one(pool)
    .await?;

    Ok(TransactionResponse {
        id: txn.id,
        account_id: txn.account_id,
        date: txn.date,
        transaction_type: txn.transaction_type,
        amount: req.amount,
        description: req.description,
        category: req.category,
        subcategory: req.subcategory,
        memo: req.memo,
        payment_method: req.payment_method,
        created_at: txn.created_at,
    })
}

/// Get a single transaction.
pub async fn get_transaction(
    pool: &PgPool,
    user_id: Uuid,
    id: Uuid,
) -> Result<TransactionResponse, AppError> {
    let txn: Transaction = sqlx::query_as(
        "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Transaction not found".to_string()))?;

    Ok(TransactionResponse {
        id: txn.id,
        account_id: txn.account_id,
        date: txn.date,
        transaction_type: txn.transaction_type,
        amount: base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &txn.amount_encrypted,
        ),
        description: base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &txn.description_encrypted,
        ),
        category: txn.category_encrypted.map(|c| {
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &c)
        }),
        subcategory: txn.subcategory_encrypted.map(|c| {
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &c)
        }),
        memo: txn.memo_encrypted.map(|m| {
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &m)
        }),
        payment_method: txn.payment_method_encrypted.map(|p| {
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &p)
        }),
        created_at: txn.created_at,
    })
}

/// Delete a transaction.
pub async fn delete_transaction(
    pool: &PgPool,
    user_id: Uuid,
    id: Uuid,
) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM transactions WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Transaction not found".to_string()));
    }

    Ok(())
}

fn generate_hash(date: &str, amount: &str, description: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(date.as_bytes());
    hasher.update(b"|");
    hasher.update(amount.as_bytes());
    hasher.update(b"|");
    hasher.update(description.as_bytes());
    hex::encode(hasher.finalize())
}
