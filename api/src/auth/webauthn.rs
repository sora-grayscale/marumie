use sqlx::PgPool;
use uuid::Uuid;
use webauthn_rs::prelude::*;

use crate::error::AppError;

/// Start WebAuthn registration: generate a challenge for the client.
pub async fn start_registration(
    webauthn: &Webauthn,
    pool: &PgPool,
    user_id: Uuid,
    username: &str,
) -> Result<(CreationChallengeResponse, PasskeyRegistration), AppError> {
    let existing_cred_ids: Vec<Vec<u8>> = sqlx::query_scalar(
        "SELECT credential_id FROM webauthn_credentials WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let exclude_credentials: Vec<CredentialID> = existing_cred_ids
        .into_iter()
        .map(CredentialID::from)
        .collect();

    let (ccr, reg_state) = webauthn
        .start_passkey_registration(user_id, username, username, Some(exclude_credentials))
        .map_err(|e| AppError::WebAuthn(format!("Registration start failed: {}", e)))?;

    Ok((ccr, reg_state))
}

/// Complete WebAuthn registration: verify the response and store the credential.
pub async fn finish_registration(
    webauthn: &Webauthn,
    pool: &PgPool,
    user_id: Uuid,
    reg_state: &PasskeyRegistration,
    response: &RegisterPublicKeyCredential,
) -> Result<(), AppError> {
    let credential = webauthn
        .finish_passkey_registration(response, reg_state)
        .map_err(|e| AppError::WebAuthn(format!("Registration finish failed: {}", e)))?;

    let credential_id = credential.cred_id().to_vec();
    let credential_json = serde_json::to_value(&credential)
        .map_err(|e| AppError::Internal(format!("Serialize credential: {}", e)))?;

    sqlx::query(
        "INSERT INTO webauthn_credentials (id, user_id, credential_id, credential_data) VALUES ($1, $2, $3, $4)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(credential_id)
    .bind(credential_json)
    .execute(pool)
    .await?;

    Ok(())
}

/// Start WebAuthn authentication: generate a challenge.
pub async fn start_authentication(
    webauthn: &Webauthn,
    pool: &PgPool,
    user_id: Uuid,
) -> Result<(RequestChallengeResponse, PasskeyAuthentication), AppError> {
    let rows: Vec<serde_json::Value> = sqlx::query_scalar(
        "SELECT credential_data FROM webauthn_credentials WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let credentials: Vec<Passkey> = rows
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect();

    if credentials.is_empty() {
        return Err(AppError::NotFound("No passkeys registered".to_string()));
    }

    let (rcr, auth_state) = webauthn
        .start_passkey_authentication(&credentials)
        .map_err(|e| AppError::WebAuthn(format!("Authentication start failed: {}", e)))?;

    Ok((rcr, auth_state))
}

/// Complete WebAuthn authentication: verify the assertion.
pub async fn finish_authentication(
    webauthn: &Webauthn,
    auth_state: &PasskeyAuthentication,
    response: &PublicKeyCredential,
) -> Result<AuthenticationResult, AppError> {
    let result = webauthn
        .finish_passkey_authentication(response, auth_state)
        .map_err(|e| AppError::WebAuthn(format!("Authentication finish failed: {}", e)))?;

    Ok(result)
}
