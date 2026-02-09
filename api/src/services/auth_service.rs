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
/// If TOTP is enabled, the caller must verify the TOTP code separately.
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

    // TOTP verification
    if user.totp_enabled {
        let totp_code = req
            .totp_code
            .as_ref()
            .ok_or_else(|| AppError::BadRequest("TOTP code required".to_string()))?;

        let totp_secret = user
            .totp_secret
            .as_ref()
            .ok_or_else(|| AppError::Internal("TOTP enabled but no secret stored".to_string()))?;

        verify_totp_code(totp_secret, &user.email, totp_code)?;
    }

    Ok(user)
}

/// Verify a TOTP code against a stored secret.
fn verify_totp_code(secret: &str, email: &str, code: &str) -> Result<(), AppError> {
    let totp = totp_rs::TOTP::new(
        totp_rs::Algorithm::SHA1,
        6,
        1,
        30,
        totp_rs::Secret::Encoded(secret.to_string())
            .to_bytes()
            .map_err(|e| AppError::Internal(format!("Invalid TOTP secret: {}", e)))?,
        Some("mirai-kojin".to_string()),
        email.to_string(),
    )
    .map_err(|e| AppError::Internal(format!("TOTP creation failed: {}", e)))?;

    let is_valid = totp
        .check_current(code)
        .map_err(|e| AppError::Internal(format!("TOTP check failed: {}", e)))?;

    if !is_valid {
        return Err(AppError::BadRequest("Invalid TOTP code".to_string()));
    }

    Ok(())
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

/// Change a user's password.
pub async fn change_password(
    pool: &PgPool,
    user_id: Uuid,
    current_password: &str,
    new_password: &str,
) -> Result<(), AppError> {
    let user = get_user(pool, user_id).await?;

    let password_hash = user
        .password_hash
        .as_ref()
        .ok_or(AppError::BadRequest("No password set for this account".to_string()))?;

    let parsed_hash = PasswordHash::new(password_hash)
        .map_err(|e| AppError::Internal(format!("Parse hash: {}", e)))?;

    Argon2::default()
        .verify_password(current_password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::BadRequest("Current password is incorrect".to_string()))?;

    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(new_password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))?
        .to_string();

    sqlx::query(
        "UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2",
    )
    .bind(&new_hash)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Setup TOTP for a user. Returns the otpauth URI.
pub async fn setup_totp(pool: &PgPool, user_id: Uuid) -> Result<String, AppError> {
    let user = get_user(pool, user_id).await?;

    let secret = totp_rs::Secret::generate_secret();
    let secret_encoded = secret.to_encoded().to_string();

    let totp = totp_rs::TOTP::new(
        totp_rs::Algorithm::SHA1,
        6,
        1,
        30,
        secret
            .to_bytes()
            .map_err(|e| AppError::Internal(format!("TOTP secret bytes: {}", e)))?,
        Some("mirai-kojin".to_string()),
        user.email.clone(),
    )
    .map_err(|e| AppError::Internal(format!("TOTP creation failed: {}", e)))?;

    // Store the secret (not yet enabled)
    sqlx::query("UPDATE users SET totp_secret = $1, updated_at = NOW() WHERE id = $2")
        .bind(&secret_encoded)
        .bind(user_id)
        .execute(pool)
        .await?;

    let uri = totp.get_url();
    Ok(uri)
}

/// Enable TOTP after verifying a code.
pub async fn enable_totp(
    pool: &PgPool,
    user_id: Uuid,
    code: &str,
) -> Result<(), AppError> {
    let user = get_user(pool, user_id).await?;

    let totp_secret = user
        .totp_secret
        .as_ref()
        .ok_or_else(|| AppError::BadRequest("TOTP not set up. Call /totp/setup first".to_string()))?;

    verify_totp_code(totp_secret, &user.email, code)?;

    sqlx::query("UPDATE users SET totp_enabled = true, updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Disable TOTP after verifying a code.
pub async fn disable_totp(
    pool: &PgPool,
    user_id: Uuid,
    code: &str,
) -> Result<(), AppError> {
    let user = get_user(pool, user_id).await?;

    if !user.totp_enabled {
        return Err(AppError::BadRequest("TOTP is not enabled".to_string()));
    }

    let totp_secret = user
        .totp_secret
        .as_ref()
        .ok_or_else(|| AppError::Internal("TOTP enabled but no secret stored".to_string()))?;

    verify_totp_code(totp_secret, &user.email, code)?;

    sqlx::query(
        "UPDATE users SET totp_enabled = false, totp_secret = NULL, updated_at = NOW() WHERE id = $1",
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Rotate encryption key (change master password).
pub async fn rotate_encryption_key(
    pool: &PgPool,
    user_id: Uuid,
    current_master_password: &str,
    new_master_password: &str,
) -> Result<(), AppError> {
    let key: crate::models::encryption_key::EncryptionKey =
        sqlx::query_as("SELECT * FROM encryption_keys WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Encryption key not found".to_string()))?;

    // Decrypt DEK with current master password
    let current_master_key =
        key_management::derive_master_key(current_master_password, &key.salt)?;
    let dek = key_management::unwrap_dek(&current_master_key, &key.encrypted_dek)?;

    // Generate new salt and derive new master key
    let new_salt = key_management::generate_salt();
    let new_master_key = key_management::derive_master_key(new_master_password, &new_salt)?;

    // Re-encrypt DEK with new master key
    let new_encrypted_dek = key_management::wrap_dek(&new_master_key, &dek)?;

    // Update the encryption_keys row (recovery_encrypted_dek stays the same)
    sqlx::query(
        "UPDATE encryption_keys SET encrypted_dek = $1, salt = $2, updated_at = NOW() WHERE user_id = $3",
    )
    .bind(&new_encrypted_dek)
    .bind(&new_salt)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Create initial user from environment variables (if no users exist).
pub async fn create_initial_user(pool: &PgPool) -> Result<(), AppError> {
    let email = match std::env::var("INITIAL_USER_EMAIL") {
        Ok(v) if !v.is_empty() => v,
        _ => return Ok(()),
    };
    let password = match std::env::var("INITIAL_USER_PASSWORD") {
        Ok(v) if !v.is_empty() => v,
        _ => return Ok(()),
    };
    let master_password = match std::env::var("INITIAL_USER_MASTER_PASSWORD") {
        Ok(v) if !v.is_empty() => v,
        _ => return Ok(()),
    };

    // Check if any users exist
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await?;

    if count.0 > 0 {
        tracing::info!("Users already exist, skipping initial user creation");
        return Ok(());
    }

    tracing::info!("Creating initial user: {}", email);

    let req = CreateUserRequest {
        email: email.clone(),
        password,
        display_name: "Admin".to_string(),
        master_password,
    };

    let (user, recovery_key) = register(pool, req).await?;

    // Set must_change_password = true
    sqlx::query("UPDATE users SET must_change_password = true WHERE id = $1")
        .bind(user.id)
        .execute(pool)
        .await?;

    tracing::info!("Initial user created: {}", email);
    tracing::info!("Recovery key (save this!): {}", recovery_key);

    Ok(())
}
