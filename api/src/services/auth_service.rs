use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use rand::rngs::OsRng;
use sqlx::PgPool;
use uuid::Uuid;

use crate::crypto::key_management;
use crate::error::AppError;
use crate::models::user::{CreateUserRequest, LoginRequest, User};

/// Register a new user. Returns (User, recovery_key).
pub async fn register(pool: &PgPool, req: CreateUserRequest) -> Result<(User, String), AppError> {
    // Check if email already exists
    let existing: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE email = $1")
            .bind(&req.email)
            .fetch_optional(pool)
            .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    // Hash the login password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))?
        .to_string();

    // Create encryption keys
    let key_salt = key_management::generate_salt();
    let master_key = key_management::derive_master_key(&req.master_password, &key_salt)?;
    let dek = key_management::generate_dek();
    let encrypted_dek = key_management::wrap_dek(&master_key, &dek)?;
    let recovery_key = key_management::generate_recovery_key();
    let recovery_encrypted_dek = key_management::wrap_dek_with_recovery(&recovery_key, &dek)?;

    let user_id = Uuid::new_v4();

    // Insert user
    let user: User = sqlx::query_as(
        "INSERT INTO users (id, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, 'owner')
         RETURNING *",
    )
    .bind(user_id)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.display_name)
    .fetch_one(pool)
    .await?;

    // Insert encryption key
    sqlx::query(
        "INSERT INTO encryption_keys (id, user_id, encrypted_dek, recovery_encrypted_dek, salt)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&encrypted_dek)
    .bind(&recovery_encrypted_dek)
    .bind(&key_salt)
    .execute(pool)
    .await?;

    Ok((user, recovery_key))
}

/// Authenticate with email + password. Returns the User.
pub async fn login(pool: &PgPool, req: &LoginRequest) -> Result<User, AppError> {
    let user: User = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(&req.email)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::Unauthorized)?;

    let password_hash = user
        .password_hash
        .as_ref()
        .ok_or(AppError::Unauthorized)?;

    let parsed_hash = PasswordHash::new(password_hash)
        .map_err(|e| AppError::Internal(format!("Parse hash: {}", e)))?;

    Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)?;

    Ok(user)
}

/// Get user by ID.
pub async fn get_user(pool: &PgPool, user_id: Uuid) -> Result<User, AppError> {
    let user: User = sqlx::query_as("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;
    Ok(user)
}

/// Get user by email.
pub async fn get_user_by_email(pool: &PgPool, email: &str) -> Result<User, AppError> {
    let user: User = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(email)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;
    Ok(user)
}

/// Get the DEK for a user given their master password.
pub async fn get_user_dek(
    pool: &PgPool,
    user_id: Uuid,
    master_password: &str,
) -> Result<[u8; 32], AppError> {
    let key: crate::models::encryption_key::EncryptionKey =
        sqlx::query_as("SELECT * FROM encryption_keys WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Encryption key not found".to_string()))?;

    let master_key = key_management::derive_master_key(master_password, &key.salt)?;
    let dek = key_management::unwrap_dek(&master_key, &key.encrypted_dek)?;
    Ok(dek)
}
