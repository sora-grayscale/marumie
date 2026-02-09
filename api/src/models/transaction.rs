use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Transaction as stored in DB (encrypted fields).
#[derive(Debug, Clone, FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub account_id: Uuid,
    pub user_id: Uuid,
    pub date: NaiveDate,
    pub transaction_type: String,
    pub amount_encrypted: Vec<u8>,
    pub description_encrypted: Vec<u8>,
    pub category_encrypted: Option<Vec<u8>>,
    pub subcategory_encrypted: Option<Vec<u8>>,
    pub memo_encrypted: Option<Vec<u8>>,
    pub payment_method_encrypted: Option<Vec<u8>>,
    pub hash: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Decrypted transaction for API responses.
#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub id: Uuid,
    pub account_id: Uuid,
    pub date: NaiveDate,
    pub transaction_type: String,
    pub amount: String,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub memo: Option<String>,
    pub payment_method: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransactionRequest {
    pub account_id: Uuid,
    pub date: NaiveDate,
    pub transaction_type: String,
    pub amount: String,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub memo: Option<String>,
    pub payment_method: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub account_id: Option<Uuid>,
    pub from_date: Option<NaiveDate>,
    pub to_date: Option<NaiveDate>,
    pub transaction_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
