use crate::csv::parser::ParsedRecord;
use crate::error::AppError;

/// Parse Rakuten Bank CSV.
/// Format: 取引日, 入出金(税込), 取引後残高, 入出金先内容
/// Date format: YYYYMMDD or YYYY/MM/DD
pub fn parse(csv_data: &str) -> Result<Vec<ParsedRecord>, AppError> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(csv_data.as_bytes());

    let mut records = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| AppError::CsvParse(format!("CSV parse error: {}", e)))?;

        if record.len() < 4 {
            continue;
        }

        let date_raw = record.get(0).unwrap_or("").trim();
        let amount_raw = record.get(1).unwrap_or("").trim();
        let balance_raw = record.get(2).unwrap_or("").trim();
        let description = record.get(3).unwrap_or("").trim().to_string();

        // Normalize date: YYYYMMDD -> YYYY-MM-DD
        let date = normalize_date(date_raw);

        // Clean amount (remove commas)
        let amount_str = amount_raw.replace(',', "");
        let amount: i64 = amount_str
            .parse()
            .map_err(|_| AppError::CsvParse(format!("Invalid amount: {}", amount_raw)))?;

        let transaction_type = if amount >= 0 {
            "income".to_string()
        } else {
            "expense".to_string()
        };

        let balance = if balance_raw.is_empty() {
            None
        } else {
            Some(balance_raw.replace(',', ""))
        };

        records.push(ParsedRecord {
            date,
            description,
            amount: amount.abs().to_string(),
            transaction_type,
            balance,
        });
    }

    Ok(records)
}

fn normalize_date(date: &str) -> String {
    let clean = date.replace('/', "").replace('-', "");
    if clean.len() == 8 {
        format!("{}-{}-{}", &clean[0..4], &clean[4..6], &clean[6..8])
    } else {
        date.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_rakuten_bank() {
        let csv = "取引日,入出金(税込),取引後残高,入出金先内容\n\
                   20240115,-5000,495000,スーパーマーケット\n\
                   20240120,300000,795000,給与振込";

        let records = parse(csv).unwrap();
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].date, "2024-01-15");
        assert_eq!(records[0].amount, "5000");
        assert_eq!(records[0].transaction_type, "expense");
        assert_eq!(records[1].transaction_type, "income");
    }
}
