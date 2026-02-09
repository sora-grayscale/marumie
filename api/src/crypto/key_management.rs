use aes_gcm::aead::OsRng;
use argon2::{Argon2, PasswordHasher};
use argon2::password_hash::SaltString;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use rand::RngCore;

use crate::error::AppError;

use super::encryption::{decrypt, encrypt};

const DEK_SIZE: usize = 32;
const RECOVERY_KEY_SIZE: usize = 32;

/// Derive a 256-bit master key from a password using Argon2id.
pub fn derive_master_key(password: &str, salt: &str) -> Result<[u8; 32], AppError> {
    let salt = SaltString::from_b64(salt)
        .map_err(|e| AppError::Crypto(format!("Invalid salt: {}", e)))?;

    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Crypto(format!("Argon2 hashing failed: {}", e)))?;

    let hash_output = hash
        .hash
        .ok_or_else(|| AppError::Crypto("Argon2 produced no hash output".to_string()))?;

    let hash_bytes = hash_output.as_bytes();
    let mut key = [0u8; 32];
    let copy_len = hash_bytes.len().min(32);
    key[..copy_len].copy_from_slice(&hash_bytes[..copy_len]);

    Ok(key)
}

/// Generate a new random salt for Argon2id.
pub fn generate_salt() -> String {
    SaltString::generate(&mut OsRng).to_string()
}

/// Generate a random Data Encryption Key (DEK).
pub fn generate_dek() -> [u8; DEK_SIZE] {
    let mut dek = [0u8; DEK_SIZE];
    OsRng.fill_bytes(&mut dek);
    dek
}

/// Wrap (encrypt) a DEK with a master key.
pub fn wrap_dek(master_key: &[u8; 32], dek: &[u8; 32]) -> Result<Vec<u8>, AppError> {
    encrypt(master_key, dek)
}

/// Unwrap (decrypt) a DEK with a master key.
pub fn unwrap_dek(master_key: &[u8; 32], wrapped_dek: &[u8]) -> Result<[u8; 32], AppError> {
    let decrypted = decrypt(master_key, wrapped_dek)?;
    if decrypted.len() != DEK_SIZE {
        return Err(AppError::Crypto(format!(
            "Invalid DEK size: expected {}, got {}",
            DEK_SIZE,
            decrypted.len()
        )));
    }
    let mut dek = [0u8; DEK_SIZE];
    dek.copy_from_slice(&decrypted);
    Ok(dek)
}

/// Generate a recovery key (random 32 bytes, returned as base64).
pub fn generate_recovery_key() -> String {
    let mut key = [0u8; RECOVERY_KEY_SIZE];
    OsRng.fill_bytes(&mut key);
    BASE64.encode(key)
}

/// Wrap a DEK with a recovery key for disaster recovery.
pub fn wrap_dek_with_recovery(
    recovery_key_b64: &str,
    dek: &[u8; 32],
) -> Result<Vec<u8>, AppError> {
    let recovery_bytes = BASE64
        .decode(recovery_key_b64)
        .map_err(|e| AppError::Crypto(format!("Invalid recovery key: {}", e)))?;
    if recovery_bytes.len() != 32 {
        return Err(AppError::Crypto("Recovery key must be 32 bytes".to_string()));
    }
    let mut recovery_key = [0u8; 32];
    recovery_key.copy_from_slice(&recovery_bytes);
    encrypt(&recovery_key, dek)
}

/// Unwrap a DEK using the recovery key.
pub fn unwrap_dek_with_recovery(
    recovery_key_b64: &str,
    wrapped_dek: &[u8],
) -> Result<[u8; 32], AppError> {
    let recovery_bytes = BASE64
        .decode(recovery_key_b64)
        .map_err(|e| AppError::Crypto(format!("Invalid recovery key: {}", e)))?;
    if recovery_bytes.len() != 32 {
        return Err(AppError::Crypto("Recovery key must be 32 bytes".to_string()));
    }
    let mut recovery_key = [0u8; 32];
    recovery_key.copy_from_slice(&recovery_bytes);
    unwrap_dek(&recovery_key, wrapped_dek)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dek_wrap_unwrap_roundtrip() {
        let master_key = [0xABu8; 32];
        let dek = generate_dek();

        let wrapped = wrap_dek(&master_key, &dek).unwrap();
        let unwrapped = unwrap_dek(&master_key, &wrapped).unwrap();

        assert_eq!(dek, unwrapped);
    }

    #[test]
    fn test_recovery_key_roundtrip() {
        let recovery_key = generate_recovery_key();
        let dek = generate_dek();

        let wrapped = wrap_dek_with_recovery(&recovery_key, &dek).unwrap();
        let unwrapped = unwrap_dek_with_recovery(&recovery_key, &wrapped).unwrap();

        assert_eq!(dek, unwrapped);
    }

    #[test]
    fn test_derive_master_key() {
        let salt = generate_salt();
        let key1 = derive_master_key("password123", &salt).unwrap();
        let key2 = derive_master_key("password123", &salt).unwrap();
        assert_eq!(key1, key2);

        let key3 = derive_master_key("different_password", &salt).unwrap();
        assert_ne!(key1, key3);
    }
}
