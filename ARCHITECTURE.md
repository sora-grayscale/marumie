# mirai-kojin アーキテクチャ設計書

## 概要

「mirai-kojin」は、[team-mirai/marumie](https://github.com/team-mirai/marumie)（政治資金可視化プラットフォーム）をベースに、
**個人・家族向けの完全プライベート家計簿アプリ**として再構築するプロジェクトです。

### 主な変更点（marumieからの差分）

| 項目 | marumie (元) | mirai-kojin (本プロジェクト) |
|------|-------------|---------------------------|
| 用途 | 政治資金の透明化 | 個人・家族の家計管理 |
| 公開範囲 | 公開プラットフォーム | 完全プライベート |
| バックエンド | Supabase (BaaS) | Rust (Axum) + PostgreSQL |
| 認証 | Supabase Auth | Passkey/WebAuthn + パスワード |
| セキュリティ | 標準 | E2EE多層防御 (アプリ層 + TDE + TLS) |
| インフラ | Vercel + Supabase Cloud | Podman Compose (セルフホスト) |
| 銀行対応 | UFJ銀行のみ | 楽天/三井住友/住信SBI |
| カード対応 | なし | 三井住友Olive/楽天/JCB |

---

## 技術スタック

| レイヤー | 技術 | 備考 |
|----------|------|------|
| Frontend | Next.js 15 + React 19 + TypeScript | marumieのwebapp/adminを統合ダッシュボードに |
| Styling | Tailwind CSS v4 | marumie踏襲 |
| Charts | Recharts + Nivo | サンキー図/月次推移/予算/資産ポートフォリオ |
| Backend API | Rust (Axum) | E2EE暗号化/復号はここで処理 |
| ORM/SQL | SQLx | コンパイル時SQL検証、マイグレーション機能付き |
| Database | PostgreSQL 16 | TDE + SSL強制 |
| 認証 | Passkey (WebAuthn) + パスワード | webauthn-rsクレート使用 |
| 鍵管理 | Argon2id鍵導出 + リカバリーキー | マスターパスワードから暗号化鍵を導出 |
| インフラ | Podman Compose | 4コンテナ構成 |
| VCS | Jujutsu (jj) | gitバックエンド |

---

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────┐
│                  Podman Network                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Next.js    │  │   Rust API   │  │ PostgreSQL │ │
│  │   Frontend   │──│   (Axum)     │──│   (TDE)    │ │
│  │   :3000      │  │   :8080      │  │   :5432    │ │
│  │              │  │              │  │            │ │
│  │ - Dashboard  │  │ - E2EE処理   │  │ - 暗号化   │ │
│  │ - CSV Upload │  │ - WebAuthn   │  │   ストレージ│ │
│  │ - 可視化     │  │ - CSVパース  │  │ - SSL接続  │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │            Backup Cron Container                │  │
│  │   - 定期暗号化DBダンプ (AES-256-GCM)            │  │
│  │   - 指定ディレクトリに保存                       │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## E2EE 多層防御設計

### レイヤー構成

```
[ブラウザ] ── HTTPS/TLS 1.3 ──→ [Rust API] ──→ [PostgreSQL]
                                    │                │
                              アプリ層暗号化      TDE暗号化
                              (AES-256-GCM)    (ディスクレベル)
```

### アプリケーション層暗号化

- **暗号化対象フィールド**: 金額(amount)、摘要(description)、メモ(memo)、カテゴリ(category)、サブカテゴリ(subcategory)、支払方法(payment_method)
- **暗号化アルゴリズム**: AES-256-GCM (認証付き暗号)
- **鍵導出**: Argon2id (マスターパスワード → 暗号化キー)
- **鍵ラップ**: 暗号化キーはマスターキーでラップしてDB保存

### 鍵管理フロー

```
1. 初回セットアップ
   ユーザー → マスターパスワード入力
   → Argon2id(password, salt) → Master Key (256bit)
   → Random生成 → Data Encryption Key (DEK)
   → AES-256-GCM(Master Key, DEK) → Encrypted DEK (DB保存)
   → Random生成 → Recovery Key (表示して保管させる)
   → AES-256-GCM(Recovery Key, DEK) → Recovery Encrypted DEK (DB保存)

2. 通常利用
   ユーザー → マスターパスワード入力
   → Argon2id → Master Key
   → Decrypt(Encrypted DEK) → DEK
   → DEKでデータ暗号化/復号

3. パスワード紛失時
   ユーザー → リカバリーキー入力
   → Decrypt(Recovery Encrypted DEK) → DEK
   → 新マスターパスワード設定
   → 新Master Keyで DEK を再ラップ
```

### DB層暗号化 (TDE)

- PostgreSQL の `pgcrypto` 拡張 + LUKS暗号化ボリューム
- Podmanボリュームを暗号化パーティション上にマウント
- DB接続はSSL必須 (`sslmode=require`)

---

## データモデル

### ERD概要

```
┌─────────┐     ┌──────────────────┐     ┌───────────────┐
│  users  │────<│  family_members  │     │   accounts    │
│         │     │                  │     │               │
│ id (PK) │     │ user_id (FK)     │     │ id (PK)       │
│ email   │     │ family_id (FK)   │     │ user_id (FK)  │
│ role    │     │ role             │     │ name          │
│ ...     │     └──────────────────┘     │ type (bank/   │
└─────────┘                              │  card)        │
                                         │ institution   │
     ┌───────────────────────┐           └───────────────┘
     │   transactions        │                  │
     │                       │                  │
     │ id (PK)               │<─────────────────┘
     │ account_id (FK)       │
     │ date                  │
     │ amount_encrypted      │  ← E2EE
     │ description_encrypted │  ← E2EE
     │ category_encrypted    │  ← E2EE
     │ memo_encrypted        │  ← E2EE
     │ type (income/expense) │
     │ hash                  │  ← 重複検出用
     │ ...                   │
     └───────────────────────┘

     ┌───────────────────────┐
     │   budgets             │
     │                       │
     │ id (PK)               │
     │ user_id (FK)          │
     │ category              │
     │ amount_encrypted      │  ← E2EE
     │ month                 │
     │ ...                   │
     └───────────────────────┘

     ┌───────────────────────┐
     │   balance_snapshots   │
     │                       │
     │ id (PK)               │
     │ account_id (FK)       │
     │ date                  │
     │ balance_encrypted     │  ← E2EE
     │ ...                   │
     └───────────────────────┘

     ┌───────────────────────┐
     │   encryption_keys     │
     │                       │
     │ id (PK)               │
     │ user_id (FK)          │
     │ encrypted_dek         │
     │ recovery_encrypted_dek│
     │ salt                  │
     │ ...                   │
     └───────────────────────┘
```

---

## 対応金融機関 CSV フォーマット

### 銀行

| 金融機関 | エンコーディング | ヘッダー行 | 日付形式 | 備考 |
|----------|----------------|-----------|---------|------|
| 楽天銀行 | Shift-JIS / UTF-8 | あり | YYYYMMDD or YYYY/MM/DD | 入出金明細CSV |
| 三井住友銀行 | Shift-JIS | あり | YYYY/MM/DD | Vpassからダウンロード |
| 住信SBI | UTF-8 | あり | YYYY/MM/DD | 明細CSVダウンロード |

### クレジットカード

| カード | エンコーディング | ヘッダー行 | 日付形式 | 備考 |
|--------|----------------|-----------|---------|------|
| 三井住友Olive | UTF-8 | あり | YYYY/MM/DD | Vpassからダウンロード |
| 楽天カード | Shift-JIS | あり | YYYY/MM/DD | e-NAVIからダウンロード |
| JCB | Shift-JIS | あり | YYYY/MM/DD | MyJCBからダウンロード |

---

## 画面構成

```
/ (ログイン/Passkey認証)
├── /dashboard         メインダッシュボード
│   ├── サンキー図 (資金フロー可視化)
│   ├── 月次収支推移グラフ
│   ├── 予算 vs 実績
│   └── 資産ポートフォリオ (全口座統合)
├── /transactions      取引一覧・検索・フィルタ
├── /import            CSVアップロード・プレビュー・取込
├── /accounts          口座・カード管理
├── /budget            予算設定・カテゴリ別管理
├── /settings          ユーザー設定
│   ├── Passkey管理
│   ├── マスターパスワード変更
│   └── 家族招待
├── /backup            バックアップ・エクスポート
│   ├── 暗号化バックアップ
│   └── CSV/JSONエクスポート
└── /admin             管理者用 (owner のみ)
    └── ユーザー管理・権限設定
```

### 権限ロール

| ロール | 閲覧 | 取引登録 | CSV取込 | 設定変更 | ユーザー管理 |
|--------|------|---------|---------|---------|------------|
| owner  | ○    | ○       | ○       | ○       | ○          |
| editor | ○    | ○       | ○       | ×       | ×          |
| viewer | ○    | ×       | ×       | ×       | ×          |

---

## ディレクトリ構成 (新規)

```
mirai-kojin/
├── frontend/              # Next.js 15 フロントエンド
│   ├── src/
│   │   ├── app/           # App Router
│   │   ├── components/    # UIコンポーネント
│   │   ├── lib/           # ユーティリティ
│   │   └── types/         # 型定義
│   ├── public/
│   ├── package.json
│   └── Containerfile
├── api/                   # Rust (Axum) APIサーバー
│   ├── src/
│   │   ├── main.rs
│   │   ├── routes/        # APIルート
│   │   ├── models/        # データモデル
│   │   ├── services/      # ビジネスロジック
│   │   ├── crypto/        # E2EE暗号化モジュール
│   │   ├── csv/           # CSVパーサー
│   │   ├── auth/          # WebAuthn認証
│   │   └── db/            # SQLx DB操作
│   ├── migrations/        # SQLxマイグレーション
│   ├── Cargo.toml
│   └── Containerfile
├── cli/                   # CSV変換CLIツール
│   ├── src/
│   ├── Cargo.toml
│   └── Containerfile
├── backup/                # バックアップコンテナ
│   ├── backup.sh
│   └── Containerfile
├── compose.yml            # Podman Compose設定
├── .env.example           # 環境変数テンプレート
├── ARCHITECTURE.md        # 本ドキュメント
├── README.md              # プロジェクトREADME
└── docs/                  # 追加ドキュメント
```

---

## Podman Compose 構成

### コンテナ一覧

| コンテナ | イメージ | ポート | 役割 |
|----------|---------|-------|------|
| frontend | node:22-alpine | 3000 | Next.js フロントエンド |
| api | rust:1.84-slim | 8080 | Rust APIサーバー |
| db | postgres:16-alpine | 5432 | PostgreSQL データベース |
| backup | alpine + pg_dump | - | 定期バックアップ |

### ネットワーク

- 内部ネットワーク: `mirai-internal` (frontend ↔ api ↔ db)
- 外部公開: frontend:3000 のみ

---

## セキュリティ要件

### 通信セキュリティ
- [ ] フロントエンド ↔ API: HTTPS/TLS 1.3
- [ ] API ↔ DB: SSL接続必須 (sslmode=require)
- [ ] CSRFトークン保護
- [ ] CORS設定 (same-origin)

### 認証・認可
- [ ] Passkey/WebAuthn対応
- [ ] パスワード認証 (Argon2id)
- [ ] セッション管理 (HttpOnly, Secure, SameSite cookie)
- [ ] ロールベースアクセス制御 (owner/editor/viewer)

### データ保護
- [ ] アプリケーション層暗号化 (AES-256-GCM)
- [ ] マスターパスワード由来鍵 (Argon2id)
- [ ] リカバリーキー
- [ ] TDE (ディスク暗号化)
- [ ] 暗号化バックアップ

### コンテナセキュリティ
- [ ] 非rootユーザーで実行
- [ ] 最小権限原則
- [ ] イメージの脆弱性スキャン
- [ ] シークレット管理 (Podman secrets)
