use crate::category;
use crate::parsers::util;
use crate::parsers::CsvParser;
use crate::unified::{TransactionType, UnifiedTransaction};
use anyhow::Result;

/// Rakuten Bank CSV parser (楽天銀行 入出金明細)
/// Encoding: Shift-JIS or UTF-8
/// Date format: YYYYMMDD or YYYY/MM/DD
pub struct RakutenBankParser;

impl CsvParser for RakutenBankParser {
    fn parse(text: &str) -> Result<Vec<UnifiedTransaction>> {
        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_reader(text.as_bytes());

        let mut transactions = Vec::new();
        let institution = "楽天銀行";

        for result in reader.records() {
            let record = result?;
            if record.len() < 5 {
                continue;
            }

            let date = util::parse_date(record.get(0).unwrap_or(""))?;
            let description = record.get(1).unwrap_or("").trim().to_string();
            let income = util::parse_amount(record.get(2).unwrap_or(""))?;
            let expense = util::parse_amount(record.get(3).unwrap_or(""))?;

            let (transaction_type, amount) = if income > 0 {
                (TransactionType::Income, income)
            } else {
                (TransactionType::Expense, expense.abs())
            };

            let cat = category::categorize(&description);
            let hash =
                UnifiedTransaction::compute_hash(&date, amount, &description, institution);

            transactions.push(UnifiedTransaction {
                date,
                category: cat.category,
                subcategory: cat.subcategory,
                amount,
                transaction_type,
                payment_method: "銀行振込".to_string(),
                description,
                memo: String::new(),
                institution: institution.to_string(),
                account_type: "bank".to_string(),
                hash,
            });
        }

        Ok(transactions)
    }
}
