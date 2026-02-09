pub mod jcb;
pub mod rakuten_bank;
pub mod rakuten_card;
pub mod sbi;
pub mod smbc;
pub mod smbc_olive;
pub mod util;

use crate::unified::{Institution, UnifiedTransaction};
use anyhow::Result;

/// Trait for financial institution CSV parsers
pub trait CsvParser {
    /// Parse decoded CSV text into unified transactions
    fn parse(text: &str) -> Result<Vec<UnifiedTransaction>>;
}

/// Parse a CSV file for a given institution into unified transactions
pub fn parse(institution: Institution, data: &[u8]) -> Result<Vec<UnifiedTransaction>> {
    let text = util::decode(data, institution.encoding())?;
    match institution {
        Institution::RakutenBank => rakuten_bank::RakutenBankParser::parse(&text),
        Institution::Smbc => smbc::SmbcParser::parse(&text),
        Institution::Sbi => sbi::SbiParser::parse(&text),
        Institution::Olive => smbc_olive::SmbcOliveParser::parse(&text),
        Institution::RakutenCard => rakuten_card::RakutenCardParser::parse(&text),
        Institution::Jcb => jcb::JcbParser::parse(&text),
    }
}
