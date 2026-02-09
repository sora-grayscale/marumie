use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fmt;

/// Supported financial institutions
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Institution {
    RakutenBank,
    Smbc,
    Sbi,
    Olive,
    RakutenCard,
    Jcb,
}

impl Institution {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "rakuten-bank" => Some(Self::RakutenBank),
            "smbc" => Some(Self::Smbc),
            "sbi" => Some(Self::Sbi),
            "olive" => Some(Self::Olive),
            "rakuten-card" => Some(Self::RakutenCard),
            "jcb" => Some(Self::Jcb),
            _ => None,
        }
    }

    pub fn encoding(&self) -> &'static str {
        match self {
            Self::RakutenBank => "shift_jis_or_utf8",
            Self::Smbc => "shift_jis",
            Self::Sbi => "utf-8",
            Self::Olive => "utf-8",
            Self::RakutenCard => "shift_jis",
            Self::Jcb => "shift_jis",
        }
    }

    pub fn account_type(&self) -> &'static str {
        match self {
            Self::RakutenBank | Self::Smbc | Self::Sbi => "bank",
            Self::Olive | Self::RakutenCard | Self::Jcb => "card",
        }
    }
}

impl fmt::Display for Institution {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RakutenBank => write!(f, "楽天銀行"),
            Self::Smbc => write!(f, "三井住友銀行"),
            Self::Sbi => write!(f, "住信SBI"),
            Self::Olive => write!(f, "三井住友Olive"),
            Self::RakutenCard => write!(f, "楽天カード"),
            Self::Jcb => write!(f, "JCB"),
        }
    }
}

/// Transaction type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionType {
    #[serde(rename = "income")]
    Income,
    #[serde(rename = "expense")]
    Expense,
}

impl fmt::Display for TransactionType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Income => write!(f, "income"),
            Self::Expense => write!(f, "expense"),
        }
    }
}

/// Unified transaction record (output format)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedTransaction {
    pub date: NaiveDate,
    pub category: String,
    pub subcategory: String,
    pub amount: i64,
    pub transaction_type: TransactionType,
    pub payment_method: String,
    pub description: String,
    pub memo: String,
    pub institution: String,
    pub account_type: String,
    pub hash: String,
}

impl UnifiedTransaction {
    /// Compute a deduplication hash from key fields
    pub fn compute_hash(
        date: &NaiveDate,
        amount: i64,
        description: &str,
        institution: &str,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(date.format("%Y-%m-%d").to_string().as_bytes());
        hasher.update(amount.to_string().as_bytes());
        hasher.update(description.as_bytes());
        hasher.update(institution.as_bytes());
        hex::encode(hasher.finalize())
    }
}

/// CSV output header fields
pub const CSV_HEADERS: [&str; 11] = [
    "date",
    "category",
    "subcategory",
    "amount",
    "transaction_type",
    "payment_method",
    "description",
    "memo",
    "institution",
    "account_type",
    "hash",
];
