# mirai-kojin - 個人・家族向けプライベート家計簿

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Podman](https://img.shields.io/badge/Podman-892CA0?logo=podman&logoColor=white)](https://podman.io/)

> [team-mirai/marumie](https://github.com/team-mirai/marumie)（政治資金可視化プラットフォーム）をベースに、
> **個人・家族向けの完全プライベート家計簿アプリ**として再構築したプロジェクトです。

## 主な特徴

- **完全プライベート**: Podman Compose でセルフホスト。データは一切外部に出ない
- **E2EE多層防御**: アプリケーション層暗号化 (AES-256-GCM) + DB TDE + TLS通信
- **Passkey/WebAuthn認証**: パスワードレスのモダンな認証
- **家族共有**: owner / editor / viewer のロール管理
- **6金融機関対応**: 楽天銀行・三井住友銀行・住信SBI・三井住友Olive・楽天カード・JCB
- **豊富な可視化**: サンキー図・月次推移・予算管理・資産ポートフォリオ
- **暗号化バックアップ**: 自動/手動の暗号化バックアップ・リストア

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| Frontend | Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 |
| Charts | Recharts + Nivo (サンキー図) |
| Backend API | Rust (Axum) + SQLx |
| Database | PostgreSQL 16 (TDE + SSL) |
| 認証 | Passkey (WebAuthn) + Argon2id パスワード |
| 暗号化 | AES-256-GCM + Argon2id鍵導出 + リカバリーキー |
| インフラ | Podman Compose (4コンテナ) |
| VCS | Jujutsu (jj) |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                  Podman Network                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Next.js    │  │   Rust API   │  │ PostgreSQL │ │
│  │   Frontend   │──│   (Axum)     │──│   (TDE)    │ │
│  │   :3000      │  │   :8080      │  │   :5432    │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │            Backup Cron Container                │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

詳細は [ARCHITECTURE.md](ARCHITECTURE.md) を参照してください。

## ディレクトリ構成

```
mirai-kojin/
├── frontend/          # Next.js 15 フロントエンド
│   ├── src/app/       # App Router (10ページ)
│   ├── src/components/# UI + チャート + レイアウト
│   ├── src/lib/       # APIクライアント・認証ヘルパー
│   └── Containerfile
├── api/               # Rust (Axum) APIサーバー
│   ├── src/routes/    # RESTful APIエンドポイント
│   ├── src/crypto/    # E2EE暗号化モジュール
│   ├── src/csv/       # 6金融機関CSVパーサー
│   ├── src/auth/      # WebAuthn + セッション
│   ├── migrations/    # SQLxマイグレーション (8ファイル)
│   └── Containerfile
├── cli/               # CSV変換CLIツール
│   ├── src/parsers/   # 6金融機関パーサー
│   ├── src/commands/  # convert / detect / import
│   └── Containerfile
├── backup/            # バックアップコンテナ
│   ├── backup.sh      # 暗号化バックアップ
│   └── restore.sh     # 復元スクリプト
├── scripts/           # セットアップスクリプト
│   ├── setup.sh       # 初回セットアップ
│   ├── generate-certs.sh
│   └── init-db.sh
├── compose.yml        # Podman Compose設定
├── ARCHITECTURE.md    # 詳細設計書
└── .env.example       # 環境変数テンプレート
```

## 対応金融機関

| 種別 | 金融機関 | エンコーディング |
|------|---------|----------------|
| 銀行 | 楽天銀行 | Shift-JIS / UTF-8 |
| 銀行 | 三井住友銀行 | Shift-JIS |
| 銀行 | 住信SBI | UTF-8 |
| カード | 三井住友Olive | UTF-8 |
| カード | 楽天カード | Shift-JIS |
| カード | JCB | Shift-JIS |

## セットアップ

### 前提条件

- Podman + podman-compose
- Rust 1.84+ (CLI単体利用時)
- Node.js 22+ (フロントエンド開発時)

### クイックスタート

```bash
# 1. リポジトリクローン
jj git clone https://github.com/sora-grayscale/marumie.git mirai-kojin
cd mirai-kojin

# 2. 初回セットアップ (SSL証明書生成 + DB起動 + 全サービス起動)
./scripts/setup.sh

# 3. ブラウザでアクセス
open http://localhost:3000
```

### 手動セットアップ

```bash
# 環境変数設定
cp .env.example .env
# .env を編集して各値を設定

# SSL証明書生成
./scripts/generate-certs.sh

# Podman Compose で起動
podman compose up -d

# DB初期化 (初回のみ)
./scripts/init-db.sh
```

### CLI CSV変換ツール

```bash
cd cli

# ビルド
cargo build --release

# 金融機関自動判定
./target/release/mirai-cli detect input.csv

# 統一フォーマットに変換
./target/release/mirai-cli convert input.csv -o output.csv --bank rakuten-bank

# ディレクトリ一括変換 (自動判定)
./target/release/mirai-cli convert ./csv_dir/ -o ./output_dir/ --auto

# APIに直接インポート
./target/release/mirai-cli import input.csv --api-url http://localhost:8080
```

## 画面構成

| パス | 機能 |
|------|------|
| `/` | ログイン (Passkey / パスワード) |
| `/dashboard` | メインダッシュボード (サンキー図/月次推移/予算/資産) |
| `/transactions` | 取引一覧 (検索/フィルタ/ページネーション) |
| `/import` | CSVインポート (アップロード/プレビュー/取込) |
| `/accounts` | 口座・カード管理 |
| `/budget` | 予算設定・カテゴリ別管理 |
| `/settings` | ユーザー設定 (Passkey/パスワード/家族招待) |
| `/backup` | バックアップ・エクスポート |
| `/admin` | 管理者用 (ユーザー管理・権限) |

## 権限ロール

| ロール | 閲覧 | 取引登録 | CSV取込 | 設定変更 | ユーザー管理 |
|--------|:----:|:-------:|:-------:|:-------:|:----------:|
| owner  | ○   | ○      | ○      | ○      | ○         |
| editor | ○   | ○      | ○      | ×      | ×         |
| viewer | ○   | ×      | ×      | ×      | ×         |

## セキュリティ

### E2EE多層防御

1. **アプリケーション層**: 金額・摘要・カテゴリ等をAES-256-GCMで暗号化してDB保存
2. **DB層**: PostgreSQL TDE (LUKS暗号化ボリューム)
3. **通信層**: TLS 1.3 + SSL接続

### 鍵管理

- マスターパスワードからArgon2idで暗号化キーを導出
- Data Encryption Key (DEK) はマスターキーでラップしてDB保存
- リカバリーキーでパスワード紛失時のDEK復旧が可能

## 開発

```bash
# フロントエンド開発
cd frontend && pnpm install && pnpm dev

# Rust API開発
cd api && cargo run

# CLI開発
cd cli && cargo run -- detect sample.csv
```

## 元プロジェクト

このプロジェクトは [team-mirai/marumie](https://github.com/team-mirai/marumie) (AGPL-3.0) をforkし、
個人・家族向けに再構築したものです。元プロジェクトの貢献者に感謝します。

## ライセンス

[GNU Affero General Public License v3.0](LICENSE)
