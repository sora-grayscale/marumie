/// Categorize a transaction description into a spending category.
/// Uses keyword matching against common Japanese merchant/transaction patterns.
pub fn categorize(description: &str) -> String {
    let desc = description.to_lowercase();

    // 食費 (Food)
    if matches_any(&desc, &[
        "スーパー", "イオン", "セブン", "ローソン", "ファミリーマート", "ファミマ",
        "マクドナルド", "吉野家", "松屋", "すき家", "ケンタッキー", "KFC",
        "スターバックス", "ドトール", "タリーズ", "コメダ",
        "イトーヨーカドー", "西友", "マルエツ", "ライフ", "サミット",
        "業務スーパー", "コストコ", "オーケー", "まいばすけっと",
        "出前館", "ubereats", "uber eats", "demaecan",
        "食品", "食料", "弁当", "レストラン", "飲食", "カフェ",
    ]) {
        return "食費".to_string();
    }

    // 日用品 (Daily necessities)
    if matches_any(&desc, &[
        "ドラッグ", "マツモトキヨシ", "ウエルシア", "スギ薬局", "ツルハ",
        "ダイソー", "セリア", "キャンドゥ", "100均",
        "ホームセンター", "カインズ", "コーナン", "ニトリ",
        "日用品", "洗剤", "シャンプー",
    ]) {
        return "日用品".to_string();
    }

    // 交通費 (Transportation)
    if matches_any(&desc, &[
        "suica", "pasmo", "icoca", "交通", "電車", "バス", "タクシー",
        "JR", "メトロ", "地下鉄", "鉄道", "新幹線", "モバイルsuica",
        "定期", "駐車", "パーキング", "ガソリン", "給油",
        "ENEOS", "出光", "コスモ石油", "ETC",
    ]) {
        return "交通費".to_string();
    }

    // 通信費 (Communications)
    if matches_any(&desc, &[
        "NTT", "ドコモ", "au", "ソフトバンク", "楽天モバイル",
        "KDDI", "通信", "インターネット", "プロバイダ",
        "Wi-Fi", "WiFi", "光回線", "携帯",
    ]) {
        return "通信費".to_string();
    }

    // 水道光熱費 (Utilities)
    if matches_any(&desc, &[
        "電力", "東京電力", "関西電力", "中部電力", "東北電力",
        "ガス", "東京ガス", "大阪ガス",
        "水道", "上下水道",
        "電気", "光熱",
    ]) {
        return "水道光熱費".to_string();
    }

    // 住居費 (Housing)
    if matches_any(&desc, &[
        "家賃", "賃貸", "管理費", "マンション", "不動産",
        "住宅ローン", "ローン返済", "修繕",
    ]) {
        return "住居費".to_string();
    }

    // 医療費 (Medical)
    if matches_any(&desc, &[
        "病院", "クリニック", "医院", "薬局", "調剤",
        "歯科", "眼科", "内科", "外科", "皮膚科",
        "医療", "健康", "保険診療",
    ]) {
        return "医療費".to_string();
    }

    // 教育費 (Education)
    if matches_any(&desc, &[
        "学校", "塾", "予備校", "通信教育", "教材",
        "書籍", "本屋", "紀伊國屋", "ジュンク堂", "丸善",
        "amazon kindle", "学費", "授業料",
    ]) {
        return "教育費".to_string();
    }

    // 保険 (Insurance)
    if matches_any(&desc, &[
        "保険", "生命保険", "損害保険", "自動車保険",
        "火災保険", "健康保険", "国民健康",
    ]) {
        return "保険".to_string();
    }

    // 娯楽 (Entertainment)
    if matches_any(&desc, &[
        "映画", "netflix", "amazon prime", "ディズニー", "hulu",
        "spotify", "youtube", "ゲーム", "steam",
        "カラオケ", "ボウリング", "遊園地",
        "旅行", "ホテル", "旅館", "航空", "ANA", "JAL",
        "チケット", "コンサート", "ライブ",
    ]) {
        return "娯楽".to_string();
    }

    // 衣服 (Clothing)
    if matches_any(&desc, &[
        "ユニクロ", "GU", "ZARA", "H&M", "しまむら",
        "衣料", "服", "アパレル", "靴", "ファッション",
    ]) {
        return "衣服".to_string();
    }

    // 美容 (Beauty)
    if matches_any(&desc, &[
        "美容", "理容", "ヘアサロン", "エステ", "ネイル",
        "化粧品", "コスメ",
    ]) {
        return "美容".to_string();
    }

    // 給与 (Income)
    if matches_any(&desc, &[
        "給与", "給料", "賞与", "ボーナス", "報酬",
        "振込", "入金",
    ]) {
        return "収入".to_string();
    }

    // 税金 (Tax)
    if matches_any(&desc, &[
        "税", "所得税", "住民税", "固定資産税", "自動車税",
        "年金", "国民年金", "厚生年金",
    ]) {
        return "税金・社会保険".to_string();
    }

    // ATM
    if matches_any(&desc, &["ATM", "引出", "引き出し", "出金"]) {
        return "現金引出".to_string();
    }

    // 振込 (Transfer)
    if matches_any(&desc, &["振込", "送金", "振替"]) {
        return "振込・送金".to_string();
    }

    "その他".to_string()
}

fn matches_any(text: &str, keywords: &[&str]) -> bool {
    keywords.iter().any(|kw| text.contains(&kw.to_lowercase()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_categorize_food() {
        assert_eq!(categorize("セブンイレブン 新宿店"), "食費");
        assert_eq!(categorize("スターバックス"), "食費");
    }

    #[test]
    fn test_categorize_transport() {
        assert_eq!(categorize("モバイルSuica チャージ"), "交通費");
    }

    #[test]
    fn test_categorize_utilities() {
        assert_eq!(categorize("東京電力EP"), "水道光熱費");
    }

    #[test]
    fn test_categorize_unknown() {
        assert_eq!(categorize("謎のお店"), "その他");
    }
}
