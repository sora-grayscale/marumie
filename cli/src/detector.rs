use crate::parsers::util;
use crate::unified::Institution;
use anyhow::Result;

/// Auto-detect financial institution from CSV file content
pub fn detect_institution(data: &[u8]) -> Result<Institution> {
    // Try UTF-8 first, then Shift-JIS
    let text = util::decode(data, "shift_jis_or_utf8")?;
    let first_lines: Vec<&str> = text.lines().take(5).collect();
    let header = first_lines.first().unwrap_or(&"").to_lowercase();

    // Rakuten Bank: 取引日,入出金(税込),取引後残高,...
    if header.contains("取引後残高") || header.contains("入出金") {
        return Ok(Institution::RakutenBank);
    }

    // SBI: 日付,内容,出金金額(円),入金金額(円),残高(円),メモ
    if header.contains("出金金額") && header.contains("入金金額") && header.contains("残高") {
        return Ok(Institution::Sbi);
    }

    // SMBC bank: お取引日,お引出し,お預入れ,お取引内容,...
    if header.contains("お取引日")
        && (header.contains("お引出し") || header.contains("お預入れ"))
    {
        return Ok(Institution::Smbc);
    }

    // Olive: ご利用日,ご利用先など,ご利用金額,...
    if header.contains("ご利用日") && header.contains("ご利用先") {
        return Ok(Institution::Olive);
    }

    // Rakuten Card: 利用日,利用店名・商品名,利用金額,...
    if header.contains("利用日") && header.contains("利用店名") {
        return Ok(Institution::RakutenCard);
    }

    // JCB: ご利用年月日,ご利用先,お支払金額,...
    if header.contains("ご利用年月日")
        || (header.contains("ご利用先") && header.contains("お支払"))
    {
        return Ok(Institution::Jcb);
    }

    anyhow::bail!(
        "Could not auto-detect financial institution from CSV header: {}",
        first_lines.first().unwrap_or(&"(empty)")
    )
}
