/// Category classification result
pub struct CategoryResult {
    pub category: String,
    pub subcategory: String,
}

/// Categorize transaction based on description keywords
pub fn categorize(description: &str) -> CategoryResult {
    let desc = description.to_lowercase();

    // Income
    if desc.contains("給料") || desc.contains("給与") || desc.contains("賞与") {
        return CategoryResult {
            category: "収入".into(),
            subcategory: "給与".into(),
        };
    }
    if desc.contains("利息") || desc.contains("利子") {
        return CategoryResult {
            category: "収入".into(),
            subcategory: "利息".into(),
        };
    }
    if desc.contains("配当") {
        return CategoryResult {
            category: "収入".into(),
            subcategory: "配当".into(),
        };
    }
    if desc.contains("還付") || desc.contains("返金") || desc.contains("キャッシュバック") {
        return CategoryResult {
            category: "収入".into(),
            subcategory: "還付・返金".into(),
        };
    }

    // Food
    if desc.contains("スーパー")
        || desc.contains("イオン")
        || desc.contains("コープ")
        || desc.contains("食品")
        || desc.contains("西友")
        || desc.contains("ライフ")
        || desc.contains("マルエツ")
    {
        return CategoryResult {
            category: "食費".into(),
            subcategory: "食料品".into(),
        };
    }
    if desc.contains("レストラン")
        || desc.contains("飲食")
        || desc.contains("カフェ")
        || desc.contains("マクドナルド")
        || desc.contains("すき家")
        || desc.contains("吉野家")
        || desc.contains("松屋")
        || desc.contains("スタバ")
        || desc.contains("starbucks")
    {
        return CategoryResult {
            category: "食費".into(),
            subcategory: "外食".into(),
        };
    }
    if desc.contains("コンビニ")
        || desc.contains("セブン")
        || desc.contains("ファミマ")
        || desc.contains("ローソン")
    {
        return CategoryResult {
            category: "食費".into(),
            subcategory: "コンビニ".into(),
        };
    }

    // Housing
    if desc.contains("電気") || desc.contains("ガス") || desc.contains("水道") || desc.contains("電力") {
        return CategoryResult {
            category: "住居".into(),
            subcategory: "光熱費".into(),
        };
    }
    if desc.contains("家賃") || desc.contains("管理費") || desc.contains("マンション") {
        return CategoryResult {
            category: "住居".into(),
            subcategory: "家賃".into(),
        };
    }

    // Communication
    if desc.contains("通信")
        || desc.contains("携帯")
        || desc.contains("ドコモ")
        || desc.contains("ソフトバンク")
        || desc.contains("au ")
        || desc.contains("ntt")
        || desc.contains("楽天モバイル")
        || desc.contains("インターネット")
        || desc.contains("wi-fi")
        || desc.contains("wifi")
    {
        return CategoryResult {
            category: "通信費".into(),
            subcategory: "通信".into(),
        };
    }

    // Transportation
    if desc.contains("交通")
        || desc.contains("suica")
        || desc.contains("pasmo")
        || desc.contains("定期")
        || desc.contains("鉄道")
        || desc.contains("バス")
        || desc.contains("タクシー")
        || desc.contains("jr ")
    {
        return CategoryResult {
            category: "交通費".into(),
            subcategory: "交通".into(),
        };
    }
    if desc.contains("ガソリン") || desc.contains("駐車") || desc.contains("高速") {
        return CategoryResult {
            category: "交通費".into(),
            subcategory: "車両".into(),
        };
    }

    // Insurance
    if desc.contains("保険") {
        return CategoryResult {
            category: "保険".into(),
            subcategory: "保険".into(),
        };
    }

    // Medical
    if desc.contains("医療") || desc.contains("病院") || desc.contains("薬局") || desc.contains("クリニック") {
        return CategoryResult {
            category: "医療費".into(),
            subcategory: "医療".into(),
        };
    }

    // Education
    if desc.contains("学費") || desc.contains("塾") || desc.contains("教育") || desc.contains("学校") {
        return CategoryResult {
            category: "教育費".into(),
            subcategory: "教育".into(),
        };
    }

    // Entertainment
    if desc.contains("映画") || desc.contains("ゲーム") || desc.contains("netflix") || desc.contains("amazon prime") || desc.contains("spotify") {
        return CategoryResult {
            category: "娯楽費".into(),
            subcategory: "エンタメ".into(),
        };
    }

    // Shopping
    if desc.contains("amazon") || desc.contains("アマゾン") || desc.contains("楽天市場") || desc.contains("ヨドバシ") || desc.contains("ビック") {
        return CategoryResult {
            category: "日用品".into(),
            subcategory: "ショッピング".into(),
        };
    }
    if desc.contains("衣料") || desc.contains("ユニクロ") || desc.contains("gu ") || desc.contains("しまむら") {
        return CategoryResult {
            category: "被服費".into(),
            subcategory: "衣料".into(),
        };
    }

    // Fees
    if desc.contains("振込手数料") || desc.contains("手数料") {
        return CategoryResult {
            category: "手数料".into(),
            subcategory: "手数料".into(),
        };
    }

    // ATM
    if desc.contains("atm") || desc.contains("ＡＴＭ") || desc.contains("現金引出") {
        return CategoryResult {
            category: "現金引出".into(),
            subcategory: "ATM".into(),
        };
    }

    // Tax
    if desc.contains("税金") || desc.contains("所得税") || desc.contains("住民税") || desc.contains("固定資産税") {
        return CategoryResult {
            category: "税金".into(),
            subcategory: "税金".into(),
        };
    }

    CategoryResult {
        category: "未分類".into(),
        subcategory: "".into(),
    }
}
