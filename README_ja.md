[English](README.md) | [中文](README_zh.md) | [한국어](README_ko.md) | [日本語](README_ja.md)

# MySQL MCP Server

AI アシスタント（Cursor、Claude など）を MySQL データベースに接続する MCP サーバーです。

自然言語でデータベースと対話できます。

## 機能

- **mysql_query** — 読み取り専用 SELECT クエリの実行（最大 1000 行）
- **mysql_execute** — INSERT / UPDATE / DELETE の実行、トランザクション対応
- **mysql_list_tables** — 全テーブル一覧（エンジン、行数、サイズ、照合順序）
- **mysql_describe_table** — テーブル構造の確認（カラム、型、キー、コメント）
- **mysql_show_indexes** — テーブルの全インデックス表示
- **mysql_show_create_table** — 完全な DDL（CREATE TABLE）のエクスポート
- **mysql_explain** — SQL 実行計画の分析（TRADITIONAL / JSON / TREE）
- **mysql_list_databases** — 全データベースとサイズの一覧
- **mysql_database_info** — バージョン、サイズ、文字セット、接続数、稼働時間
- **mysql_show_processlist** — アクティブな接続と実行中のクエリの表示

## セキュリティ

- SQL インジェクションパターン検出（DROP、TRUNCATE、OUTFILE、LOAD_FILE など）
- クエリ長制限（4096 文字）
- テーブル名/データベース名のホワイトリスト検証（英数字とアンダースコアのみ）
- 書き込み操作はデフォルトで無効（環境変数で有効化）
- トランザクション対応、エラー時自動ロールバック
- コネクションプール（最大 10 接続）
- パラメータ化クエリ対応
- MySQL 8.0+ `caching_sha2_password` 認証をネイティブサポート

## クイックスタート

### 方法 1: npx（推奨）

#### Cursor

`~/.cursor/mcp.json` に追加：

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "npx",
      "args": ["-y", "@kyruntime/mysql-mcp"],
      "env": {
        "MYSQL_HOST": "127.0.0.1",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASS": "パスワード",
        "MYSQL_DB": "データベース名",
        "MAX_ROWS": "1000",
        "ALLOW_INSERT_OPERATION": "false",
        "ALLOW_UPDATE_OPERATION": "false",
        "ALLOW_DELETE_OPERATION": "false"
      }
    }
  }
}
```

#### Codex CLI

`~/.codex/config.toml` に追加：

```toml
[mcp_servers.mysql-mcp]
command = "npx"
args = ["-y", "@kyruntime/mysql-mcp"]

[mcp_servers.mysql-mcp.env]
MYSQL_HOST = "127.0.0.1"
MYSQL_PORT = "3306"
MYSQL_USER = "root"
MYSQL_PASS = "パスワード"
MYSQL_DB = "データベース名"
MAX_ROWS = "1000"
ALLOW_INSERT_OPERATION = "false"
ALLOW_UPDATE_OPERATION = "false"
ALLOW_DELETE_OPERATION = "false"
```

### 方法 2: クローンして実行

```bash
git clone https://github.com/kyruntime/mysql-mcp.git
cd mysql-mcp
npm install
```

`mcp.json` に設定：

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "node",
      "args": ["/path/to/mysql-mcp/index.js"],
      "env": {
        "MYSQL_HOST": "127.0.0.1",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASS": "パスワード",
        "MYSQL_DB": "データベース名",
        "MAX_ROWS": "1000",
        "ALLOW_INSERT_OPERATION": "false",
        "ALLOW_UPDATE_OPERATION": "false",
        "ALLOW_DELETE_OPERATION": "false"
      }
    }
  }
}
```

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| MYSQL_HOST | 127.0.0.1 | データベースホスト |
| MYSQL_PORT | 3306 | データベースポート |
| MYSQL_USER | root | データベースユーザー |
| MYSQL_PASS | （空） | データベースパスワード |
| MYSQL_DB | （空） | データベース名 |
| MAX_ROWS | 1000 | SELECT の最大返却行数 |
| ALLOW_INSERT_OPERATION | false | INSERT を有効化 |
| ALLOW_UPDATE_OPERATION | false | UPDATE を有効化 |
| ALLOW_DELETE_OPERATION | false | DELETE を有効化 |

## 使用例

AI アシスタントに聞いてみましょう：

```
「データベースにどんなテーブルがありますか？」
「users テーブルの構造を見せてください」
「orders テーブルにはどんなインデックスがありますか？」
「products テーブルの CREATE TABLE を表示してください」
「金額が最も高い注文を 10 件検索してください」
「このクエリはインデックスを使っていますか？ SELECT * FROM orders WHERE user_id = 1」
「このサーバーにはどんなデータベースがありますか？」
「データベースのサイズはどのくらいですか？」
「遅いクエリが実行中ですか？」
```

## 動作要件

- Node.js >= 18
- MySQL 5.7+ または MySQL 8.0+（推奨）
- MCP 対応 AI クライアント（Cursor、Claude Desktop など）

## 今後の予定

- [ ] マルチデータベース切り替え（`USE db_name`）
- [ ] テーブルデータの CSV エクスポート
- [ ] スロークエリの自動分析と最適化提案

## ライセンス

MIT
