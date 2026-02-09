use crate::error::AppError;
use encoding_rs::SHIFT_JIS;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ParsedRecord {
    pub date: String,
    pub description: String,
    pub amount: String,
    pub transaction_type: String,
    pub balance: Option<String>,
}

/// Decode CSV data, auto-detecting Shift-JIS or UTF-8.
pub fn decode_csv(raw: &str) -> String {
    // If the data is already valid UTF-8, return as-is
    if raw.is_ascii() || !raw.contains('\u{FFFD}') {
        return raw.to_string();
    }
    // Try Shift-JIS decode
    let (decoded, _, had_errors) = SHIFT_JIS.decode(raw.as_bytes());
    if !had_errors {
        return decoded.into_owned();
    }
    raw.to_string()
}

/// Decode raw bytes, auto-detecting encoding.
pub fn decode_bytes(raw: &[u8]) -> String {
    // Try UTF-8 first
    if let Ok(s) = std::str::from_utf8(raw) {
        return s.to_string();
    }
    // Fallback to Shift-JIS
    let (decoded, _, _) = SHIFT_JIS.decode(raw);
    decoded.into_owned()
}

/// Parse CSV data based on detected institution.
pub fn parse(csv_data: &str, institution: &str) -> Result<Vec<ParsedRecord>, AppError> {
    let decoded = decode_csv(csv_data);

    match institution {
        "rakuten_bank" => super::rakuten_bank::parse(&decoded),
        "smbc" => super::smbc::parse(&decoded),
        "sbi" => super::sbi::parse(&decoded),
        "smbc_olive" => super::smbc_olive::parse(&decoded),
        "rakuten_card" => super::rakuten_card::parse(&decoded),
        "jcb" => super::jcb::parse(&decoded),
        _ => Err(AppError::CsvParse(format!(
            "Unsupported institution: {}",
            institution
        ))),
    }
}
