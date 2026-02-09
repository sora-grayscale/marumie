use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::csv::category::categorize;
use crate::csv::detector::detect_institution as detect_csv_institution;
use crate::error::AppError;

/// Detect financial institution from CSV data.
pub fn detect_institution(csv_data: &str) -> Result<String, AppError> {
    detect_csv_institution(csv_data).ok_or_else(|| {
        AppError::CsvParse("Could not detect financial institution from CSV".to_string())
    })
}

/// Parse CSV data into records.
pub fn parse_csv(csv_data: &str) -> Result<Vec<serde_json::Value>, AppError> {
    let institution = detect_csv_institution(csv_data)
        .ok_or_else(|| AppError::CsvParse("Unknown CSV format".to_string()))?;

    let records = crate::csv::parser::parse(csv_data, &institution)?;

    let json_records: Vec<serde_json::Value> = records
        .into_iter()
        .map(|r| {
            let category = categorize(&r.description);
            serde_json::json!({
                "date": r.date,
                "description": r.description,
                "amount": r.amount,
                "transaction_type": r.transaction_type,
                "category": category,
                "balance": r.balance,
            })
        })
        .collect();

    Ok(json_records)
}

/// Import CSV records into the database.
pub async fn import_csv(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
    csv_data: &str,
) -> Result<usize, AppError> {
    let institution = detect_csv_institution(csv_data)
        .ok_or_else(|| AppError::CsvParse("Unknown CSV format".to_string()))?;

    let records = crate::csv::parser::parse(csv_data, &institution)?;
    let mut imported = 0;

    for record in &records {
        let hash = generate_hash(&record.date, &record.amount, &record.description);

        // Skip duplicates
        let existing: Option<(Uuid,)> =
            sqlx::query_as("SELECT id FROM transactions WHERE user_id = $1 AND hash = $2")
                .bind(user_id)
                .bind(&hash)
                .fetch_optional(pool)
                .await?;

        if existing.is_some() {
            continue;
        }

        let category = categorize(&record.description);
        let amount_bytes = record.amount.as_bytes().to_vec();
        let description_bytes = record.description.as_bytes().to_vec();
        let category_bytes = category.as_bytes().to_vec();

        sqlx::query(
            "INSERT INTO transactions
             (id, account_id, user_id, date, transaction_type, amount_encrypted, description_encrypted,
              category_encrypted, hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(Uuid::new_v4())
        .bind(account_id)
        .bind(user_id)
        .bind(chrono::NaiveDate::parse_from_str(&record.date, "%Y-%m-%d")
            .or_else(|_| chrono::NaiveDate::parse_from_str(&record.date, "%Y/%m/%d"))
            .map_err(|e| AppError::CsvParse(format!("Invalid date '{}': {}", record.date, e)))?)
        .bind(&record.transaction_type)
        .bind(&amount_bytes)
        .bind(&description_bytes)
        .bind(&category_bytes)
        .bind(&hash)
        .execute(pool)
        .await?;

        imported += 1;
    }

    Ok(imported)
}

fn generate_hash(date: &str, amount: &str, description: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(date.as_bytes());
    hasher.update(b"|");
    hasher.update(amount.as_bytes());
    hasher.update(b"|");
    hasher.update(description.as_bytes());
    hex::encode(hasher.finalize())
}
