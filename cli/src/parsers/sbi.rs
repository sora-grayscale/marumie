use crate::category;
use crate::parsers::util;
use crate::parsers::CsvParser;
use crate::unified::{TransactionType, UnifiedTransaction};
use anyhow::Result;

/// SBI Sumishin Net Bank CSV parser (住信SBI 明細CSV)
/// Encoding: UTF-8
/// Date format: YYYY/MM/DD
pub struct SbiParser;

impl CsvParser for SbiParser {
    fn parse(text: &str) -> Result<Vec<UnifiedTransaction>> {
        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_reader(text.as_bytes());

        let mut transactions = Vec::new();
        let institution = "住信SBI";

        for result in reader.records() {
            let record = result?;
            if record.len() < 5 {
                continue;
            }

            let date = util::parse_date(record.get(0).unwrap_or(""))?;
            let description = record.get(1).unwrap_or("").trim().to_string();
            let income = util::parse_amount(record.get(2).unwrap_or(""))?;
            let expense = util::parse_amount(record.get(3).unwrap_or(""))?;
            let memo = record.get(4).unwrap_or("").trim().to_string();

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
                memo,
                institution: institution.to_string(),
                account_type: "bank".to_string(),
                hash,
            });
        }

        Ok(transactions)
    }
}
