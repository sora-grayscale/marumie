use axum::extract::State;
use axum::http::header::SET_COOKIE;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put};
use axum::{Json, Router};
use serde::Deserialize;

use crate::auth::session::{create_session, delete_session, Session};
use crate::error::AppError;
use crate::models::user::{CreateUserRequest, LoginRequest, PasswordChangeRequest, UserResponse};
use crate::services::auth_service;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/logout", post(logout))
        .route("/me", get(me))
        .route("/password", put(change_password))
        .route("/totp/setup", post(totp_setup))
        .route("/totp/enable", post(totp_enable))
        .route("/totp/disable", post(totp_disable))
        .route("/encryption/rotate", post(encryption_rotate))
        .route("/webauthn/register/start", post(webauthn_register_start))
        .route("/webauthn/register/finish", post(webauthn_register_finish))
        .route("/webauthn/login/start", post(webauthn_login_start))
        .route("/webauthn/login/finish", post(webauthn_login_finish))
}

async fn register(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let (user, recovery_key) = auth_service::register(&state.pool, req).await?;
    let session_id = create_session(&state.pool, user.id).await?;

    let cookie = format!(
        "session_id={}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000",
        session_id
    );

    Ok((
        StatusCode::CREATED,
        [(SET_COOKIE, cookie)],
        Json(serde_json::json!({
            "user": UserResponse::from(user),
            "recovery_key": recovery_key,
        })),
    ))
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = auth_service::login(&state.pool, &req).await?;
    let session_id = create_session(&state.pool, user.id).await?;

    let cookie = format!(
        "session_id={}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000",
        session_id
    );

    Ok((
        [(SET_COOKIE, cookie)],
        Json(serde_json::json!({
            "user": UserResponse::from(user),
        })),
    ))
}

async fn logout(
    State(state): State<AppState>,
    session: Session,
) -> Result<impl IntoResponse, AppError> {
    delete_session(&state.pool, session.id).await?;

    let cookie = "session_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";

    Ok(([(SET_COOKIE, cookie.to_string())], StatusCode::NO_CONTENT))
}

async fn me(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<UserResponse>, AppError> {
    let user = auth_service::get_user(&state.pool, session.user_id).await?;
    Ok(Json(UserResponse::from(user)))
}

async fn change_password(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<PasswordChangeRequest>,
) -> Result<StatusCode, AppError> {
    auth_service::change_password(
        &state.pool,
        session.user_id,
        &req.current_password,
        &req.new_password,
    )
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn totp_setup(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<serde_json::Value>, AppError> {
    let uri = auth_service::setup_totp(&state.pool, session.user_id).await?;
    Ok(Json(serde_json::json!({
        "otpauth_uri": uri,
    })))
}

#[derive(Debug, Deserialize)]
struct TotpCodeRequest {
    code: String,
}

async fn totp_enable(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<TotpCodeRequest>,
) -> Result<StatusCode, AppError> {
    auth_service::enable_totp(&state.pool, session.user_id, &req.code).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn totp_disable(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<TotpCodeRequest>,
) -> Result<StatusCode, AppError> {
    auth_service::disable_totp(&state.pool, session.user_id, &req.code).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
struct EncryptionRotateRequest {
    current_master_password: String,
    new_master_password: String,
}

async fn encryption_rotate(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<EncryptionRotateRequest>,
) -> Result<StatusCode, AppError> {
    auth_service::rotate_encryption_key(
        &state.pool,
        session.user_id,
        &req.current_master_password,
        &req.new_master_password,
    )
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn webauthn_register_start(
    State(state): State<AppState>,
    session: Session,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = auth_service::get_user(&state.pool, session.user_id).await?;

    let (ccr, reg_state) =
        crate::auth::webauthn::start_registration(&state.webauthn, &state.pool, user.id, &user.email)
            .await?;

    let reg_state_json = serde_json::to_value(&reg_state)
        .map_err(|e| AppError::Internal(format!("Serialize reg state: {}", e)))?;

    // Store reg_state in a temporary way (in production, use session storage)
    sqlx::query(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
         ON CONFLICT (id) DO UPDATE SET expires_at = NOW() + INTERVAL '5 minutes'"
    )
    .bind(uuid::Uuid::new_v4()) // temp storage key
    .bind(session.user_id)
    .execute(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "challenge": ccr,
        "registration_state": reg_state_json,
    })))
}

async fn webauthn_register_finish(
    State(state): State<AppState>,
    session: Session,
    Json(body): Json<serde_json::Value>,
) -> Result<StatusCode, AppError> {
    let reg_state: webauthn_rs::prelude::PasskeyRegistration =
        serde_json::from_value(body["registration_state"].clone())
            .map_err(|e| AppError::BadRequest(format!("Invalid registration state: {}", e)))?;

    let response: webauthn_rs::prelude::RegisterPublicKeyCredential =
        serde_json::from_value(body["response"].clone())
            .map_err(|e| AppError::BadRequest(format!("Invalid response: {}", e)))?;

    crate::auth::webauthn::finish_registration(
        &state.webauthn,
        &state.pool,
        session.user_id,
        &reg_state,
        &response,
    )
    .await?;

    Ok(StatusCode::CREATED)
}

async fn webauthn_login_start(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let email = body["email"]
        .as_str()
        .ok_or_else(|| AppError::BadRequest("email required".to_string()))?;

    let user = auth_service::get_user_by_email(&state.pool, email).await?;

    let (rcr, auth_state) =
        crate::auth::webauthn::start_authentication(&state.webauthn, &state.pool, user.id).await?;

    let auth_state_json = serde_json::to_value(&auth_state)
        .map_err(|e| AppError::Internal(format!("Serialize auth state: {}", e)))?;

    Ok(Json(serde_json::json!({
        "challenge": rcr,
        "authentication_state": auth_state_json,
        "user_id": user.id,
    })))
}

async fn webauthn_login_finish(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let auth_state: webauthn_rs::prelude::PasskeyAuthentication =
        serde_json::from_value(body["authentication_state"].clone())
            .map_err(|e| AppError::BadRequest(format!("Invalid auth state: {}", e)))?;

    let response: webauthn_rs::prelude::PublicKeyCredential =
        serde_json::from_value(body["response"].clone())
            .map_err(|e| AppError::BadRequest(format!("Invalid response: {}", e)))?;

    let _result =
        crate::auth::webauthn::finish_authentication(&state.webauthn, &auth_state, &response)
            .await?;

    let user_id: uuid::Uuid = serde_json::from_value(body["user_id"].clone())
        .map_err(|e| AppError::BadRequest(format!("Invalid user_id: {}", e)))?;

    let session_id = create_session(&state.pool, user_id).await?;

    let cookie = format!(
        "session_id={}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000",
        session_id
    );

    let user = auth_service::get_user(&state.pool, user_id).await?;

    Ok((
        [(SET_COOKIE, cookie)],
        Json(serde_json::json!({
            "user": UserResponse::from(user),
        })),
    ))
}
