use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Budget as stored in DB (encrypted amount).
#[derive(Debug, Clone, FromRow)]
pub struct Budget {
    pub id: Uuid,
    pub user_id: Uuid,
    pub category: String,
    pub amount_encrypted: Vec<u8>,
    pub year: i32,
    pub month: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct BudgetResponse {
    pub id: Uuid,
    pub category: String,
    pub amount: String,
    pub year: i32,
    pub month: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBudgetRequest {
    pub category: String,
    pub amount: String,
    pub year: i32,
    pub month: i32,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBudgetRequest {
    pub amount: Option<String>,
    pub category: Option<String>,
}
