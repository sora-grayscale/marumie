use anyhow::{Context, Result};
use chrono::NaiveDate;
use encoding_rs::{SHIFT_JIS, UTF_8};

/// Decode bytes to String, handling Shift-JIS and UTF-8
pub fn decode(data: &[u8], encoding_hint: &str) -> Result<String> {
    match encoding_hint {
        "shift_jis" => {
            let (text, _, had_errors) = SHIFT_JIS.decode(data);
            if had_errors {
                anyhow::bail!("Failed to decode as Shift-JIS");
            }
            Ok(text.into_owned())
        }
        "utf-8" => {
            let (text, _, had_errors) = UTF_8.decode(data);
            if had_errors {
                anyhow::bail!("Failed to decode as UTF-8");
            }
            Ok(text.into_owned())
        }
        "shift_jis_or_utf8" => {
            // Try UTF-8 first, fall back to Shift-JIS
            let (text, _, had_errors) = UTF_8.decode(data);
            if !had_errors {
                return Ok(text.into_owned());
            }
            let (text, _, had_errors) = SHIFT_JIS.decode(data);
            if had_errors {
                anyhow::bail!("Failed to decode as UTF-8 or Shift-JIS");
            }
            Ok(text.into_owned())
        }
        _ => anyhow::bail!("Unknown encoding: {}", encoding_hint),
    }
}

/// Parse date string in YYYY/MM/DD or YYYYMMDD format
pub fn parse_date(s: &str) -> Result<NaiveDate> {
    let trimmed = s.trim();
    if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y/%m/%d") {
        return Ok(d);
    }
    if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        return Ok(d);
    }
    if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y%m%d") {
        return Ok(d);
    }
    anyhow::bail!("Cannot parse date: '{}'", trimmed)
}

/// Parse amount string (remove commas, handle negative)
pub fn parse_amount(s: &str) -> Result<i64> {
    let cleaned = s.trim().replace(',', "").replace('¥', "").replace('円', "");
    if cleaned.is_empty() || cleaned == "-" {
        return Ok(0);
    }
    cleaned
        .parse::<i64>()
        .with_context(|| format!("Cannot parse amount: '{}'", s))
}
