/**
 * Alter 검색 스킬 — SELECT 게이트 + 인메모리 SQL (sql.js)
 */

import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

export const SEARCH_RESULT_CAP = 10000;
export const SEARCH_STORE_CAP = 10000;
export const SEARCH_TABLE_ROW_CAP = 10000;

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|attach|detach|pragma|replace|vacuum|reindex|analyze|grant|revoke|truncate|merge|copy|into|load_extension|sqlite_master|sqlite_temp)\b/i;

let sqlJsPromise = null;

const resolveSqlJsWasm = () => {
  const require = createRequire(join(process.cwd(), "package.json"));
  const entry = require.resolve("sql.js");
  const nextToEntry = join(dirname(entry), "sql-wasm.wasm");
  const candidates = [
    nextToEntry,
    join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"),
    join(process.cwd(), "backend/node_modules/sql.js/dist/sql-wasm.wasm"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("sql.js wasm 파일을 찾을 수 없습니다.");
};

const loadSqlJs = async () => {
  if (sqlJsPromise) return sqlJsPromise;
  sqlJsPromise = (async () => {
    const mod = await import("sql.js");
    const initSqlJs = mod.default || mod;
    const wasmBinary = readFileSync(resolveSqlJsWasm());
    return initSqlJs({ wasmBinary });
  })();
  return sqlJsPromise;
};

export const stripSqlComments = (sql) =>
  String(sql || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .trim();

/**
 * 단일 SELECT만 허용. DDL/DML·확장 함수는 거절.
 * @param {string} raw
 * @returns {string} 정규화된 SQL
 */
export const assertSelectOnly = (raw) => {
  const stripped = stripSqlComments(raw);
  if (!stripped) {
    const err = new Error("SQL이 비어 있습니다.");
    err.code = "SEARCH_SQL_INVALID";
    throw err;
  }
  const parts = stripped
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 1) {
    const err = new Error("한 개의 SELECT만 실행할 수 있습니다.");
    err.code = "SEARCH_SQL_INVALID";
    throw err;
  }
  const sql = parts[0];
  if (!/^\s*select\b/i.test(sql)) {
    const err = new Error("SELECT 문만 사용할 수 있습니다.");
    err.code = "SEARCH_SQL_INVALID";
    throw err;
  }
  const withoutStrings = sql.replace(/'(?:''|[^'])*'/g, "''");
  if (FORBIDDEN.test(withoutStrings)) {
    const err = new Error("조회(SELECT) 외의 SQL은 사용할 수 없습니다.");
    err.code = "SEARCH_SQL_INVALID";
    throw err;
  }
  return sql;
};

/**
 * FROM/JOIN에 나온 식별자 중 허용 테이블만.
 * @param {string} sql
 * @param {string[]} allowedNames
 * @returns {string[]}
 */
export const extractReferencedTables = (sql, allowedNames) => {
  const allowed = new Set(allowedNames);
  const found = new Set();
  const re =
    /(?:from|join)\s+(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))/gi;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[1] || m[2] || m[3];
    if (name && allowed.has(name)) found.add(name);
  }
  return [...found];
};

export const ensureLimit = (sql, cap = SEARCH_RESULT_CAP) => {
  const m = String(sql).match(/\blimit\s+(\d+)/i);
  if (!m) return `${sql} LIMIT ${cap}`;
  const n = Number(m[1]);
  if (Number.isFinite(n) && n > cap) {
    return String(sql).replace(/\blimit\s+\d+/i, `LIMIT ${cap}`);
  }
  return sql;
};

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

const sqlValue = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  const text = String(value);
  return `'${text.replace(/'/g, "''")}'`;
};

const inferType = (rows, col) => {
  for (const row of rows) {
    const v = row?.[col];
    if (typeof v === "number" && Number.isFinite(v)) return "REAL";
    if (typeof v === "boolean") return "INTEGER";
  }
  return "TEXT";
};

/**
 * 권한 필터된 테이블을 메모리 DB에 올리고 SELECT 실행.
 * @param {string} sql
 * @param {Array<{ name: string, columns: string[], rows: Array<Record<string, unknown>> }>} tables
 */
export const runSelect = async (sql, tables) => {
  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  try {
    for (const table of tables) {
      const cols = table.columns.filter(Boolean);
      if (!cols.length) continue;
      const colDefs = cols
        .map((c) => `${quoteIdent(c)} ${inferType(table.rows, c)}`)
        .join(", ");
      db.run(`CREATE TABLE ${quoteIdent(table.name)} (${colDefs})`);
      const insert = `INSERT INTO ${quoteIdent(table.name)} (${cols
        .map(quoteIdent)
        .join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
      const stmt = db.prepare(insert);
      for (const row of table.rows || []) {
        stmt.bind(
          cols.map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return null;
            if (typeof v === "number" || typeof v === "boolean") return v;
            return String(v);
          })
        );
        stmt.step();
        stmt.reset();
      }
      stmt.free();
    }

    const limited = ensureLimit(assertSelectOnly(sql));
    const result = db.exec(limited);
    if (!result.length) {
      return { columns: [], rows: [], rowCount: 0 };
    }
    const columns = result[0].columns || [];
    const rows = (result[0].values || []).map((vals) => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = vals[i];
      });
      return obj;
    });
    return {
      columns,
      rows,
      rowCount: rows.length,
    };
  } finally {
    db.close();
  }
};

/** 테스트에서 값 이스케이프만 필요할 때 */
export const _sqlValue = sqlValue;
