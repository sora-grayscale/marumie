use crate::csv::parser::ParsedRecord;
use crate::error::AppError;

/// Parse SBI Sumishin Net Bank CSV.
/// Columns: 日付, 内容, 出金金額(円), 入金金額(円), 残高(円)
pub fn parse(csv_data: &str) -> Result<Vec<ParsedRecord>, AppError> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(csv_data.as_bytes());

    let mut records = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| AppError::CsvParse(format!("CSV parse error: {}", e)))?;

        if record.len() < 5 {
            continue;
        }

        let date = record.get(0).unwrap_or("").trim().replace('/', "-");
        let description = record.get(1).unwrap_or("").trim().to_string();
        let withdrawal = record.get(2).unwrap_or("").trim().replace(',', "");
        let deposit = record.get(3).unwrap_or("").trim().replace(',', "");
        let balance_raw = record.get(4).unwrap_or("").trim().replace(',', "");

        if date.is_empty() {
            continue;
        }

        let balance = if balance_raw.is_empty() {
            None
        } else {
            Some(balance_raw)
        };

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_sbi() {
        let csv = "日付,内容,出金金額(円),入金金額(円),残高(円)\n\
                   2024/01/15,ATM引出し,10000,,490000\n\
                   2024/01/20,給与,,300000,790000";

        let records = parse(csv).unwrap();
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].transaction_type, "expense");
        assert_eq!(records[0].amount, "10000");
        assert_eq!(records[1].transaction_type, "income");
    }
}
