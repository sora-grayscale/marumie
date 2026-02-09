use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Balance snapshot as stored in DB (encrypted balance).
#[derive(Debug, Clone, FromRow)]
pub struct BalanceSnapshot {
    pub id: Uuid,
    pub account_id: Uuid,
    pub user_id: Uuid,
    pub date: NaiveDate,
    pub balance_encrypted: Vec<u8>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct BalanceSnapshotResponse {
    pub id: Uuid,
    pub account_id: Uuid,
    pub date: NaiveDate,
    pub balance: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBalanceSnapshotRequest {
    pub account_id: Uuid,
    pub date: NaiveDate,
    pub balance: String,
}
