use super::parser::decode_csv;

/// Detect financial institution from CSV header patterns.
pub fn detect_institution(csv_data: &str) -> Option<String> {
    let decoded = decode_csv(csv_data);
    let first_lines: String = decoded.lines().take(3).collect::<Vec<_>>().join("\n");
    let lower = first_lines.to_lowercase();

    // 楽天銀行: "取引日","入出金(税込)","取引後残高","入出金先内容"
    if lower.contains("取引日") && lower.contains("入出金") && lower.contains("取引後残高") {
        return Some("rakuten_bank".to_string());
    }

    // 三井住友銀行 (SMBC): headers contain "お引出し" or "お預入れ"
    if (lower.contains("お引出し") || lower.contains("お預入れ")) && !lower.contains("olive") {
        return Some("smbc".to_string());
    }

    // 住信SBI: "日付","内容","出金金額(円)","入金金額(円)","残高(円)"
    if lower.contains("出金金額") && lower.contains("入金金額") && lower.contains("残高") {
        return Some("sbi".to_string());
    }

    // 三井住友Olive: "ご利用日","ご利用先など","ご利用金額"
    if lower.contains("ご利用日") && lower.contains("ご利用先") && lower.contains("ご利用金額") {
        return Some("smbc_olive".to_string());
    }

    // 楽天カード: "利用日","利用店名・商品名","利用金額"
    if lower.contains("利用日") && lower.contains("利用店名") {
        return Some("rakuten_card".to_string());
    }

    // JCB: "ご利用年月日","ご利用先","お支払金額" or "ご利用金額"
    if lower.contains("ご利用年月日") && lower.contains("ご利用先") {
        return Some("jcb".to_string());
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_rakuten_bank() {
        let csv = "取引日,入出金(税込),取引後残高,入出金先内容\n20240101,1000,50000,テスト";
        assert_eq!(detect_institution(csv), Some("rakuten_bank".to_string()));
    }

    #[test]
    fn test_detect_sbi() {
        let csv = "日付,内容,出金金額(円),入金金額(円),残高(円)\n2024/01/01,テスト,1000,,50000";
        assert_eq!(detect_institution(csv), Some("sbi".to_string()));
    }

    #[test]
    fn test_detect_unknown() {
        let csv = "col1,col2,col3\nval1,val2,val3";
        assert_eq!(detect_institution(csv), None);
    }
}
