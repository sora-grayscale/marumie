use crate::csv::parser::ParsedRecord;
use crate::error::AppError;

/// Parse SMBC (三井住友銀行) CSV from Vpass.
/// Typical columns: 年月日, お引出し, お預入れ, お取り扱い内容, 残高
pub fn parse(csv_data: &str) -> Result<Vec<ParsedRecord>, AppError> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(csv_data.as_bytes());

    let headers = reader
        .headers()
        .map_err(|e| AppError::CsvParse(format!("CSV header error: {}", e)))?
        .clone();

    let date_idx = find_column(&headers, &["年月日", "日付"]);
    let withdrawal_idx = find_column(&headers, &["お引出し", "引出", "出金"]);
    let deposit_idx = find_column(&headers, &["お預入れ", "預入", "入金"]);
    let description_idx = find_column(&headers, &["お取り扱い内容", "摘要", "内容"]);
    let balance_idx = find_column(&headers, &["残高"]);

    let mut records = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| AppError::CsvParse(format!("CSV parse error: {}", e)))?;

        let date = date_idx
            .and_then(|i| record.get(i))
            .map(|d| normalize_date(d.trim()))
            .unwrap_or_default();

        if date.is_empty() {
            continue;
        }

        let withdrawal = withdrawal_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().replace(',', ""))
            .unwrap_or_default();

        let deposit = deposit_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().replace(',', ""))
            .unwrap_or_default();

        let description = description_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        let balance = balance_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().replace(',', ""))
            .filter(|s| !s.is_empty());

        let (amount, transaction_type) = if !withdrawal.is_empty() && withdrawal != "0" {
            (withdrawal, "expense".to_string())
        } else if !deposit.is_empty() && deposit != "0" {
            (deposit, "income".to_string())
        } else {
            continue;
        };

        records.push(ParsedRecord {
            date,
            description,
            amount,
            transaction_type,
            balance,
        });
    }

    Ok(records)
}

fn find_column(headers: &csv::StringRecord, candidates: &[&str]) -> Option<usize> {
    for (i, header) in headers.iter().enumerate() {
        let h = header.trim();
        for candidate in candidates {
            if h.contains(candidate) {
                return Some(i);
            }
        }
    }
    None
}

fn normalize_date(date: &str) -> String {
    // YYYY/MM/DD -> YYYY-MM-DD
    date.replace('/', "-")
}
