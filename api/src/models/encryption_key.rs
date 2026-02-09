use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

/// Encryption key metadata stored in DB.
#[derive(Debug, Clone, FromRow)]
pub struct EncryptionKey {
    pub id: Uuid,
    pub user_id: Uuid,
    pub encrypted_dek: Vec<u8>,
    pub recovery_encrypted_dek: Vec<u8>,
    pub salt: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
