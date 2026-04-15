#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mysql from "mysql2/promise";

// ============================================================
// 配置：从环境变量读取数据库连接信息
// ============================================================

const poolConfig = {
  host:     process.env.MYSQL_HOST     || "127.0.0.1",
  port:     Number(process.env.MYSQL_PORT || "3306"),
  user:     process.env.MYSQL_USER     || "root",
  password: process.env.MYSQL_PASS     || "",
  database: process.env.MYSQL_DB       || "",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            "utf8mb4",
  connectTimeout:     10000,
};

const pool = mysql.createPool(poolConfig);

const ALLOW_INSERT = process.env.ALLOW_INSERT_OPERATION === "true";
const ALLOW_UPDATE = process.env.ALLOW_UPDATE_OPERATION === "true";
const ALLOW_DELETE = process.env.ALLOW_DELETE_OPERATION === "true";

const MAX_QUERY_LENGTH = 4096;
const MAX_ROWS = Number(process.env.MAX_ROWS || "1000");

// ============================================================
// 安全检查
// ============================================================

function checkSQL(sql) {
  if (sql.length > MAX_QUERY_LENGTH) {
    throw new Error(`SQL 超出长度限制（最大 ${MAX_QUERY_LENGTH} 字符）`);
  }

  const dangerousPatterns = [
    /;\s*DROP\s+/i,
    /;\s*TRUNCATE\s+/i,
    /INTO\s+OUTFILE/i,
    /INTO\s+DUMPFILE/i,
    /LOAD_FILE\s*\(/i,
    /LOAD\s+DATA\s+/i,
    /;\s*ALTER\s+/i,
    /;\s*CREATE\s+/i,
    /;\s*GRANT\s+/i,
    /;\s*REVOKE\s+/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      throw new Error("检测到危险 SQL 语句，已拒绝执行");
    }
  }
}

function checkWritePermission(sqlType) {
  if (sqlType === "INSERT" && !ALLOW_INSERT) {
    throw new Error("INSERT 操作未授权，请在环境变量中设置 ALLOW_INSERT_OPERATION=true");
  }
  if (sqlType === "UPDATE" && !ALLOW_UPDATE) {
    throw new Error("UPDATE 操作未授权，请在环境变量中设置 ALLOW_UPDATE_OPERATION=true");
  }
  if (sqlType === "DELETE" && !ALLOW_DELETE) {
    throw new Error("DELETE 操作未授权，请在环境变量中设置 ALLOW_DELETE_OPERATION=true");
  }
}

function sanitizeTableName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error("表名只允许字母、数字和下划线");
  }
  return name;
}

// ============================================================
// MCP Server 定义
// ============================================================

const server = new McpServer({
  name: "mysql-mcp",
  version: "1.0.0",
});

// --------------------------------------------------
// 工具 1：只读查询
// --------------------------------------------------
server.tool(
  "mysql_query",
  `执行只读 SELECT 查询，返回查询结果（最多 ${MAX_ROWS} 行）。支持 SELECT / WITH / EXPLAIN / SHOW / DESCRIBE 语句。`,
  {
    sql: z.string().describe("SQL SELECT 语句"),
  },
  async ({ sql }) => {
    checkSQL(sql);

    const sqlType = sql.trim().split(/\s+/)[0].toUpperCase();
    if (sqlType !== "SELECT" && sqlType !== "WITH" && sqlType !== "EXPLAIN" && sqlType !== "SHOW" && sqlType !== "DESCRIBE") {
      throw new Error("mysql_query 只允许 SELECT / WITH / EXPLAIN / SHOW / DESCRIBE 语句");
    }

    const limitedSQL = sql.replace(/;+\s*$/, "");
    const needsLimit = sqlType === "SELECT" || sqlType === "WITH";
    const finalSQL = needsLimit ? `${limitedSQL} LIMIT ${MAX_ROWS}` : limitedSQL;

    const [rows] = await pool.query(finalSQL);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 2：执行增删改
// --------------------------------------------------
const executeDesc = [
  "执行 INSERT / UPDATE / DELETE 操作，自动包裹事务。",
  `当前权限：INSERT=${ALLOW_INSERT ? "✅已开启" : "❌未开启"}，UPDATE=${ALLOW_UPDATE ? "✅已开启" : "❌未开启"}，DELETE=${ALLOW_DELETE ? "✅已开启" : "❌未开启"}。`,
  "【重要】如果目标操作的权限为❌未开启，请不要调用本工具，直接告知用户需在 mcp.json 的 env 中将对应的 ALLOW_*_OPERATION 设为 true 并重启 MCP 后才能执行。",
].join(" ");

server.tool(
  "mysql_execute",
  executeDesc,
  {
    sql: z.string().describe("SQL 语句（INSERT / UPDATE / DELETE）"),
  },
  async ({ sql }) => {
    const sqlType = sql.trim().split(/\s+/)[0].toUpperCase();
    if (sqlType === "SELECT") {
      throw new Error("查询请使用 mysql_query 工具");
    }
    checkWritePermission(sqlType);
    checkSQL(sql);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(sql);
      await conn.commit();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            affectedRows: result.affectedRows,
            insertId: result.insertId || null,
            changedRows: result.changedRows || 0,
          }, null, 2),
        }],
      };
    } catch (error) {
      await conn.rollback();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
            code: error.code,
            errno: error.errno,
          }, null, 2),
        }],
      };
    } finally {
      conn.release();
    }
  }
);

// --------------------------------------------------
// 工具 3：列出所有表
// --------------------------------------------------
server.tool(
  "mysql_list_tables",
  "列出当前数据库中所有表，包含引擎、行数、大小、排序规则等信息",
  {},
  async () => {
    const [rows] = await pool.query(
      `SELECT
         TABLE_NAME AS table_name,
         ENGINE AS engine,
         TABLE_ROWS AS estimated_rows,
         CONCAT(ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2), ' MB') AS total_size,
         CONCAT(ROUND(DATA_LENGTH / 1024 / 1024, 2), ' MB') AS data_size,
         CONCAT(ROUND(INDEX_LENGTH / 1024 / 1024, 2), ' MB') AS index_size,
         TABLE_COLLATION AS collation,
         TABLE_COMMENT AS comment,
         CREATE_TIME AS created_at,
         UPDATE_TIME AS updated_at
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 4：查看表结构
// --------------------------------------------------
server.tool(
  "mysql_describe_table",
  "查看指定表的详细字段信息：字段名、类型、是否可空、键类型、默认值、注释",
  {
    table: z.string().describe("表名"),
  },
  async ({ table }) => {
    const safeName = sanitizeTableName(table);
    const [rows] = await pool.query(
      `SELECT
         COLUMN_NAME AS column_name,
         COLUMN_TYPE AS column_type,
         IS_NULLABLE AS is_nullable,
         COLUMN_KEY AS column_key,
         COLUMN_DEFAULT AS column_default,
         EXTRA AS extra,
         COLUMN_COMMENT AS comment
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [safeName]
    );
    if (rows.length === 0) {
      return { content: [{ type: "text", text: `表 "${table}" 不存在或没有字段` }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 5：查看表索引
// --------------------------------------------------
server.tool(
  "mysql_show_indexes",
  "查看指定表的所有索引信息，包含索引名、唯一性、字段、基数等",
  {
    table: z.string().describe("表名"),
  },
  async ({ table }) => {
    const safeName = sanitizeTableName(table);
    const [rows] = await pool.query(`SHOW INDEX FROM \`${safeName}\``);
    if (rows.length === 0) {
      return { content: [{ type: "text", text: `表 "${table}" 没有索引` }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 6：导出建表语句
// --------------------------------------------------
server.tool(
  "mysql_show_create_table",
  "查看指定表的完整 DDL 建表语句，包含字段、索引、外键、引擎、字符集等",
  {
    table: z.string().describe("表名"),
  },
  async ({ table }) => {
    const safeName = sanitizeTableName(table);
    const [rows] = await pool.query(`SHOW CREATE TABLE \`${safeName}\``);
    if (rows.length === 0) {
      return { content: [{ type: "text", text: `表 "${table}" 不存在` }] };
    }
    return {
      content: [{ type: "text", text: rows[0]["Create Table"] }],
    };
  }
);

// --------------------------------------------------
// 工具 7：执行计划
// --------------------------------------------------
server.tool(
  "mysql_explain",
  "分析 SQL 语句的执行计划，帮助定位慢查询原因（全表扫描、缺少索引等）",
  {
    sql: z.string().describe("要分析的 SQL 语句（通常是 SELECT）"),
    format: z.enum(["TRADITIONAL", "JSON", "TREE"]).optional()
      .describe("输出格式：TRADITIONAL（默认表格）、JSON（详细 JSON）、TREE（树形结构，MySQL 8.0+）"),
  },
  async ({ sql, format }) => {
    checkSQL(sql);

    const fmt = format || "TRADITIONAL";
    const explainSQL = `EXPLAIN FORMAT=${fmt} ${sql.replace(/;+\s*$/, "")}`;
    const [rows] = await pool.query(explainSQL);

    if (fmt === "JSON") {
      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
    if (fmt === "TREE") {
      return {
        content: [{ type: "text", text: Object.values(rows[0])[0] }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 8：列出所有数据库
// --------------------------------------------------
server.tool(
  "mysql_list_databases",
  "列出 MySQL 实例中的所有数据库及其大小",
  {},
  async () => {
    const [rows] = await pool.query(
      `SELECT
         SCHEMA_NAME AS database_name,
         DEFAULT_CHARACTER_SET_NAME AS charset,
         DEFAULT_COLLATION_NAME AS collation,
         CONCAT(ROUND(SUM(IFNULL(T.DATA_LENGTH + T.INDEX_LENGTH, 0)) / 1024 / 1024, 2), ' MB') AS total_size
       FROM information_schema.SCHEMATA S
       LEFT JOIN information_schema.TABLES T ON S.SCHEMA_NAME = T.TABLE_SCHEMA
       GROUP BY S.SCHEMA_NAME, S.DEFAULT_CHARACTER_SET_NAME, S.DEFAULT_COLLATION_NAME
       ORDER BY S.SCHEMA_NAME`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 9：数据库基本信息
// --------------------------------------------------
server.tool(
  "mysql_database_info",
  "查看当前数据库的版本、大小、字符集、表数量、连接数等全局信息",
  {},
  async () => {
    const [[versionRow]] = await pool.query("SELECT VERSION() AS version");
    const [[dbSizeRow]] = await pool.query(
      `SELECT
         CONCAT(ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2), ' MB') AS size
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()`
    );
    const [[tableCountRow]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
    );
    const [[charsetRow]] = await pool.query(
      `SELECT DEFAULT_CHARACTER_SET_NAME AS charset, DEFAULT_COLLATION_NAME AS collation
       FROM information_schema.SCHEMATA
       WHERE SCHEMA_NAME = DATABASE()`
    );
    const [[connRow]] = await pool.query(
      `SELECT COUNT(*) AS active_connections FROM information_schema.PROCESSLIST`
    );
    const [[uptimeRow]] = await pool.query(
      `SHOW GLOBAL STATUS LIKE 'Uptime'`
    );

    const uptimeSeconds = Number(uptimeRow?.Value || 0);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    const info = {
      version: versionRow.version,
      database: process.env.MYSQL_DB,
      size: dbSizeRow.size || "0 MB",
      tableCount: Number(tableCountRow.count),
      charset: charsetRow.charset,
      collation: charsetRow.collation,
      activeConnections: Number(connRow.active_connections),
      uptime: `${days}d ${hours}h ${minutes}m`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 10：查看进程列表
// --------------------------------------------------
server.tool(
  "mysql_show_processlist",
  "查看当前 MySQL 的所有活跃连接和正在执行的查询，有助于排查慢查询和死锁",
  {},
  async () => {
    const [rows] = await pool.query(
      `SELECT
         ID AS id,
         USER AS user,
         HOST AS host,
         DB AS db,
         COMMAND AS command,
         TIME AS time_seconds,
         STATE AS state,
         LEFT(INFO, 500) AS query
       FROM information_schema.PROCESSLIST
       ORDER BY TIME DESC`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
    };
  }
);

// --------------------------------------------------
// 工具 11：切换数据库
// --------------------------------------------------
server.tool(
  "mysql_use_database",
  "切换当前连接到指定数据库（等同于 USE db_name），后续所有查询将在新数据库上执行",
  {
    database: z.string().describe("要切换到的目标数据库名"),
  },
  async ({ database }) => {
    if (!/^[a-zA-Z0-9_]+$/.test(database)) {
      throw new Error("数据库名只允许字母、数字和下划线");
    }

    const conn = await pool.getConnection();
    try {
      await conn.query(`USE \`${database}\``);
    } finally {
      conn.release();
    }

    // 更新连接池配置，使后续新连接也使用该数据库
    pool.pool.config.connectionConfig.database = database;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: `已切换到数据库: ${database}`,
          current_database: database,
        }, null, 2),
      }],
    };
  }
);

// --------------------------------------------------
// 工具 12：导出表数据为 CSV
// --------------------------------------------------
server.tool(
  "mysql_export_csv",
  `导出指定表（或自定义 SELECT 查询）的数据为 CSV 格式文本（最多 ${MAX_ROWS} 行）。可直接复制保存为 .csv 文件。`,
  {
    table: z.string().optional().describe("要导出的表名（与 sql 二选一）"),
    sql: z.string().optional().describe("自定义 SELECT 查询（与 table 二选一，优先使用）"),
    columns: z.array(z.string()).optional().describe("指定要导出的列（仅在使用 table 参数时生效，默认导出全部列）"),
    where: z.string().optional().describe("WHERE 条件（仅在使用 table 参数时生效）"),
    limit: z.number().optional().describe(`导出行数上限，默认 ${MAX_ROWS}`),
  },
  async ({ table, sql: customSQL, columns, where, limit }) => {
    let finalSQL;

    if (customSQL) {
      checkSQL(customSQL);
      const sqlType = customSQL.trim().split(/\s+/)[0].toUpperCase();
      if (sqlType !== "SELECT" && sqlType !== "WITH") {
        throw new Error("导出 CSV 只允许 SELECT / WITH 查询");
      }
      finalSQL = customSQL.replace(/;+\s*$/, "");
    } else if (table) {
      const safeName = sanitizeTableName(table);
      const cols = columns && columns.length > 0
        ? columns.map(c => `\`${sanitizeTableName(c)}\``).join(", ")
        : "*";
      finalSQL = `SELECT ${cols} FROM \`${safeName}\``;
      if (where) {
        finalSQL += ` WHERE ${where}`;
      }
    } else {
      throw new Error("必须提供 table 或 sql 参数之一");
    }

    const rowLimit = Math.min(limit || MAX_ROWS, MAX_ROWS);
    finalSQL = `${finalSQL} LIMIT ${rowLimit}`;

    checkSQL(finalSQL);
    const [rows] = await pool.query(finalSQL);

    if (!rows || rows.length === 0) {
      return { content: [{ type: "text", text: "查询结果为空，无数据可导出" }] };
    }

    const headers = Object.keys(rows[0]);

    const escapeCsvField = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [headers.join(",")];
    for (const row of rows) {
      csvLines.push(headers.map(h => escapeCsvField(row[h])).join(","));
    }
    const csv = csvLines.join("\n");

    return {
      content: [{
        type: "text",
        text: `-- 共 ${rows.length} 行数据，${headers.length} 列 --\n\n${csv}`,
      }],
    };
  }
);

// ============================================================
// 启动
// ============================================================

const transport = new StdioServerTransport();
await server.connect(transport);
