[English](README.md) | [中文](README_zh.md) | [한국어](README_ko.md) | [日本語](README_ja.md)

# MySQL MCP Server

一个将 AI 助手（Cursor、Claude 等）连接到 MySQL 数据库的 MCP 服务器。

用自然语言与你的数据库对话。

## 功能

- **mysql_query** — 执行只读 SELECT 查询（最多返回 1000 行）
- **mysql_execute** — 执行 INSERT / UPDATE / DELETE，支持事务
- **mysql_list_tables** — 列出所有表，包含引擎、行数、大小、排序规则
- **mysql_describe_table** — 查看表结构（字段、类型、键、注释）
- **mysql_show_indexes** — 查看表的所有索引
- **mysql_show_create_table** — 导出完整的 DDL 建表语句
- **mysql_explain** — 分析 SQL 执行计划（TRADITIONAL / JSON / TREE）
- **mysql_list_databases** — 列出所有数据库及大小
- **mysql_database_info** — 查看版本、大小、字符集、连接数、运行时间
- **mysql_show_processlist** — 查看活跃连接和正在执行的查询

## 安全性

- SQL 注入模式检测（DROP、TRUNCATE、OUTFILE、LOAD_FILE 等）
- 查询长度限制（4096 字符）
- 表名/数据库名白名单校验（仅允许字母、数字、下划线）
- 写操作默认关闭（需通过环境变量开启）
- 事务支持，出错自动回滚
- 连接池（最大 10 个连接）
- 支持参数化查询
- 原生支持 MySQL 8.0+ `caching_sha2_password` 认证

## 快速开始

### 方式一：npx（推荐）

在 `~/.cursor/mcp.json` 中添加：

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
        "MYSQL_PASS": "你的密码",
        "MYSQL_DB": "你的数据库名"
      }
    }
  }
}
```

### 方式二：克隆运行

```bash
git clone https://github.com/kyruntime/mysql-mcp.git
cd mysql-mcp
npm install
```

然后在 `mcp.json` 中配置：

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
        "MYSQL_PASS": "你的密码",
        "MYSQL_DB": "你的数据库名"
      }
    }
  }
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| MYSQL_HOST | 127.0.0.1 | 数据库地址 |
| MYSQL_PORT | 3306 | 数据库端口 |
| MYSQL_USER | root | 数据库用户名 |
| MYSQL_PASS | （空） | 数据库密码 |
| MYSQL_DB | （空） | 数据库名 |
| MAX_ROWS | 1000 | SELECT 最大返回行数 |
| ALLOW_INSERT_OPERATION | false | 开启 INSERT |
| ALLOW_UPDATE_OPERATION | false | 开启 UPDATE |
| ALLOW_DELETE_OPERATION | false | 开启 DELETE |

## 使用示例

对你的 AI 助手说：

```
"帮我查一下数据库里有哪些表"
"看一下 users 表的结构"
"orders 表有哪些索引？"
"导出 products 表的建表语句"
"查询金额最高的 10 条订单"
"这个查询走了索引吗？SELECT * FROM orders WHERE user_id = 1"
"MySQL 上有哪些数据库？"
"数据库有多大？"
"有没有慢查询在跑？"
```

## 环境要求

- Node.js >= 18
- MySQL 5.7+ 或 MySQL 8.0+（推荐）
- 支持 MCP 的 AI 客户端（Cursor、Claude Desktop 等）

## 未来计划

- [ ] 支持多数据库切换（`USE db_name`）
- [ ] 支持表数据导出为 CSV
- [ ] 慢查询自动分析与优化建议

## 许可证

MIT
