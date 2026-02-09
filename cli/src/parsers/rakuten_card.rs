use crate::category;
use crate::parsers::util;
use crate::parsers::CsvParser;
use crate::unified::{TransactionType, UnifiedTransaction};
use anyhow::Result;

/// Rakuten Card CSV parser (楽天カード e-NAVI明細)
/// Encoding: Shift-JIS
/// Date format: YYYY/MM/DD
pub struct RakutenCardParser;

impl CsvParser for RakutenCardParser {
    fn parse(text: &str) -> Result<Vec<UnifiedTransaction>> {
        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_reader(text.as_bytes());

        let mut transactions = Vec::new();
        let institution = "楽天カード";

        for result in reader.records() {
            let record = result?;
            if record.len() < 4 {
                continue;
            }

            let date = util::parse_date(record.get(0).unwrap_or(""))?;
            let description = record.get(1).unwrap_or("").trim().to_string();
            let amount_raw = util::parse_amount(record.get(2).unwrap_or(""))?;
            let memo = record.get(3).unwrap_or("").trim().to_string();

            // Card: positive = expense, negative = refund/income
            let (transaction_type, amount) = if amount_raw < 0 {
                (TransactionType::Income, amount_raw.abs())
            } else {
                (TransactionType::Expense, amount_raw)
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
                payment_method: "クレジットカード".to_string(),
                description,
                memo,
                institution: institution.to_string(),
                account_type: "card".to_string(),
                hash,
            });
        }

        Ok(transactions)
    }
}
