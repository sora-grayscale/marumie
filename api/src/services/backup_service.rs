use sqlx::PgPool;
use uuid::Uuid;

use crate::crypto::key_management;
use crate::error::AppError;
use crate::models::encryption_key::EncryptionKey;

/// Export all user data as JSON (for backup/download).
pub async fn export_user_data(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<serde_json::Value, AppError> {
    let accounts: Vec<serde_json::Value> = sqlx::query_scalar(
        "SELECT json_build_object('id', id, 'name', name, 'account_type', account_type, 'institution', institution)
         FROM accounts WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let transaction_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM transactions WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(pool)
            .await?;

    let budget_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM budgets WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(pool)
            .await?;

    Ok(serde_json::json!({
        "user_id": user_id,
        "accounts": accounts,
        "transaction_count": transaction_count.0,
        "budget_count": budget_count.0,
        "exported_at": chrono::Utc::now().to_rfc3339(),
    }))
}

/// Verify that a recovery key is valid for a user.
pub async fn verify_recovery_key(
    pool: &PgPool,
    user_id: Uuid,
    recovery_key: &str,
) -> Result<(), AppError> {
    let key: EncryptionKey =
        sqlx::query_as("SELECT * FROM encryption_keys WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Encryption key not found".to_string()))?;

    // Try to unwrap the DEK with the recovery key
    key_management::unwrap_dek_with_recovery(recovery_key, &key.recovery_encrypted_dek)?;

    Ok(())
}

/// Restore access using recovery key and set a new master password.
pub async fn restore_with_recovery(
    pool: &PgPool,
    user_id: Uuid,
    recovery_key: &str,
    new_master_password: &str,
) -> Result<(), AppError> {
    let key: EncryptionKey =
        sqlx::query_as("SELECT * FROM encryption_keys WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Encryption key not found".to_string()))?;

    // Decrypt DEK with recovery key
    let dek =
        key_management::unwrap_dek_with_recovery(recovery_key, &key.recovery_encrypted_dek)?;

    // Create new master key from new password
    let new_salt = key_management::generate_salt();
    let new_master_key = key_management::derive_master_key(new_master_password, &new_salt)?;
    let new_encrypted_dek = key_management::wrap_dek(&new_master_key, &dek)?;

    // Update encryption key record
    sqlx::query(
        "UPDATE encryption_keys SET encrypted_dek = $1, salt = $2, updated_at = NOW()
         WHERE user_id = $3",
    )
    .bind(&new_encrypted_dek)
    .bind(&new_salt)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}
