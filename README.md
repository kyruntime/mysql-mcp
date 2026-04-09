[English](README.md) | [中文](README_zh.md) | [한국어](README_ko.md) | [日本語](README_ja.md)

# MySQL MCP Server

An MCP server that connects AI assistants (Cursor, Claude, etc.) to MySQL databases.

Talk to your database in natural language.

## Features

- **mysql_query** — Execute read-only SELECT queries (max 1000 rows)
- **mysql_execute** — Execute INSERT / UPDATE / DELETE with transaction support
- **mysql_list_tables** — List all tables with engine, rows, size, collation
- **mysql_describe_table** — Show table structure (columns, types, keys, comments)
- **mysql_show_indexes** — Show all indexes on a table
- **mysql_show_create_table** — Export full DDL (CREATE TABLE statement)
- **mysql_explain** — Analyze query execution plans (TRADITIONAL / JSON / TREE)
- **mysql_list_databases** — List all databases with sizes
- **mysql_database_info** — Show version, size, charset, connections, uptime
- **mysql_show_processlist** — Show active connections and running queries

## Security

- SQL injection pattern detection (DROP, TRUNCATE, OUTFILE, LOAD_FILE, etc.)
- Query length limit (4096 chars)
- Table/database name sanitization (whitelist: alphanumeric + underscore)
- Write operations disabled by default (opt-in via env vars)
- Transactions with auto-rollback on error
- Connection pooling (max 10)
- Parameterized queries where applicable
- MySQL 8.0+ `caching_sha2_password` natively supported

## Quick Start

### Option 1: npx (recommended)

#### Cursor

Add to your `~/.cursor/mcp.json`:

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
        "MYSQL_PASS": "your_password",
        "MYSQL_DB": "your_database",
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

Add to your `~/.codex/config.toml`:

```toml
[mcp_servers.mysql-mcp]
command = "npx"
args = ["-y", "@kyruntime/mysql-mcp"]

[mcp_servers.mysql-mcp.env]
MYSQL_HOST = "127.0.0.1"
MYSQL_PORT = "3306"
MYSQL_USER = "root"
MYSQL_PASS = "your_password"
MYSQL_DB = "your_database"
MAX_ROWS = "1000"
ALLOW_INSERT_OPERATION = "false"
ALLOW_UPDATE_OPERATION = "false"
ALLOW_DELETE_OPERATION = "false"
```

### Option 2: Clone and run

```bash
git clone https://github.com/kyruntime/mysql-mcp.git
cd mysql-mcp
npm install
```

Then in `mcp.json`:

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
        "MYSQL_PASS": "your_password",
        "MYSQL_DB": "your_database",
        "MAX_ROWS": "1000",
        "ALLOW_INSERT_OPERATION": "false",
        "ALLOW_UPDATE_OPERATION": "false",
        "ALLOW_DELETE_OPERATION": "false"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| MYSQL_HOST | 127.0.0.1 | Database host |
| MYSQL_PORT | 3306 | Database port |
| MYSQL_USER | root | Database user |
| MYSQL_PASS | (empty) | Database password |
| MYSQL_DB | (empty) | Database name |
| MAX_ROWS | 1000 | Maximum rows returned by SELECT |
| ALLOW_INSERT_OPERATION | false | Enable INSERT |
| ALLOW_UPDATE_OPERATION | false | Enable UPDATE |
| ALLOW_DELETE_OPERATION | false | Enable DELETE |

## Usage Examples

Ask your AI assistant:

```
"Show me all tables in the database"
"Describe the users table"
"What indexes does the orders table have?"
"Show me the CREATE TABLE for products"
"Find the top 10 orders by amount"
"Is this query using an index? SELECT * FROM orders WHERE user_id = 1"
"What databases are on this server?"
"How big is the database?"
"Are there any slow queries running?"
```

## Requirements

- Node.js >= 18
- MySQL 5.7+ or MySQL 8.0+ (recommended)
- MCP-compatible AI client (Cursor, Claude Desktop, etc.)

## Roadmap

- [ ] Multi-database switching (`USE db_name`)
- [ ] Export table data to CSV
- [ ] Slow query auto-analysis with optimization suggestions

## License

MIT
