use crate::csv::parser::ParsedRecord;
use crate::error::AppError;

/// Parse JCB card CSV from MyJCB.
/// Columns: ご利用年月日, ご利用先, ご利用金額 (or お支払金額)
pub fn parse(csv_data: &str) -> Result<Vec<ParsedRecord>, AppError> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(csv_data.as_bytes());

    let headers = reader
        .headers()
        .map_err(|e| AppError::CsvParse(format!("CSV header error: {}", e)))?
        .clone();

    let date_idx = find_column(&headers, &["ご利用年月日", "利用日"]);
    let description_idx = find_column(&headers, &["ご利用先", "利用先"]);
    let amount_idx = find_column(&headers, &["ご利用金額", "お支払金額", "利用金額"]);

    let mut records = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| AppError::CsvParse(format!("CSV parse error: {}", e)))?;

        let date = date_idx
            .and_then(|i| record.get(i))
            .map(|d| d.trim().replace('/', "-"))
            .unwrap_or_default();

        if date.is_empty() {
            continue;
        }

        let description = description_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        let amount_raw = amount_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().replace(',', "").replace('"', "").replace('¥', ""))
            .unwrap_or_default();

        if amount_raw.is_empty() {
            continue;
        }

        let amount = amount_raw.trim_start_matches('-').to_string();

        records.push(ParsedRecord {
            date,
            description,
            amount,
            transaction_type: "expense".to_string(),
            balance: None,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_jcb() {
        let csv = "ご利用年月日,ご利用先,ご利用金額\n\
                   2024/01/15,東京電力,8500";

        let records = parse(csv).unwrap();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].description, "東京電力");
        assert_eq!(records[0].amount, "8500");
    }
}
