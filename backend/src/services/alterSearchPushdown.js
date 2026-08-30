/**
 * Alter 검색 — SELECT 등호/IN만 Mongo 선필터로 옮긴다.
 * LLM 쿼리를 Mongo에 실행하지 않는다.
 */

import { stripSqlComments } from "./alterSearchSql.js";

const SQL_STRING = /'(?:''|[^'])*'/g;

/** 가상 컬럼 → Mongo 필드. 목록에 없는 컬럼은 푸시하지 않는다. */
export const PUSHDOWN_COLUMNS = {
  registrations: {
    user_name: "userName",
    user_id_login: "userId",
    grade: "grade",
    role: "role",
    year: "year",
    term: "term",
  },
  syllabi: {
    class_title: "classTitle",
    creator_name: "userName",
    year: "year",
    term: "term",
  },
  enrollments: {
    student_name: "studentName",
    student_login: "studentId",
    student_grade: "studentGrade",
    class_title: "classTitle",
    year: "year",
    term: "term",
  },
  enrollment_evaluations: {
    student_name: "studentName",
    student_login: "studentId",
    student_grade: "studentGrade",
    class_title: "classTitle",
    year: "year",
    term: "term",
  },
  forms: {
    title: "title",
  },
  form_rows: {
    respondent_name: "_respondentName",
  },
  calendar_events: {
    title: "title",
    scope: "scope",
  },
  boards: {
    name: "name",
  },
  posts: {
    title: "title",
    author_name: "authorName",
  },
};

const ARCHIVE_COLUMNS = {
  user_name: "userName",
  grade: "grade",
};

const FORM_TABLE_COLUMNS = {
  respondent_name: "_respondentName",
  respondent_login: "_respondentId",
};

const JOIN_STOP = new Set([
  "on",
  "where",
  "join",
  "inner",
  "left",
  "right",
  "cross",
  "full",
  "group",
  "order",
  "limit",
  "having",
  "union",
  "set",
  "as",
]);

export const mergeQueryAnd = (...parts) => {
  const cleaned = parts.filter(
    (p) => p && typeof p === "object" && Object.keys(p).length > 0
  );
  const flat = [];
  for (const p of cleaned) {
    if (Array.isArray(p.$and) && Object.keys(p).length === 1) {
      flat.push(...p.$and);
    } else {
      flat.push(p);
    }
  }
  if (!flat.length) return {};
  if (flat.length === 1) return { ...flat[0] };
  return { $and: flat };
};

const maskStrings = (sql) => String(sql || "").replace(SQL_STRING, "''");

export const extractWhereClause = (sql) => {
  const stripped = stripSqlComments(sql);
  const m = stripped.match(
    /\bwhere\b([\s\S]*?)(?:\bgroup\s+by\b|\border\s+by\b|\blimit\b|\bhaving\b|$)/i
  );
  return m ? m[1].trim() : "";
};

export const whereHasOr = (sql) => /\bor\b/i.test(maskStrings(extractWhereClause(sql)));

const unescapeSqlString = (raw) => String(raw || "").replace(/''/g, "'");

const parseInList = (inner) => {
  const values = [];
  const re = /'((?:''|[^'])*)'/g;
  let m;
  while ((m = re.exec(inner))) {
    values.push(unescapeSqlString(m[1]));
  }
  return values;
};

export const extractTableAliases = (sql) => {
  const stripped = stripSqlComments(sql);
  const aliasToTable = {};
  const tables = [];
  const re =
    /(?:from|join)\s+(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?/gi;
  let m;
  while ((m = re.exec(stripped))) {
    const table = m[1] || m[2] || m[3];
    if (!table) continue;
    tables.push(table);
    const alias = m[4] ? m[4].toLowerCase() : "";
    if (alias && !JOIN_STOP.has(alias)) {
      aliasToTable[alias] = table;
    }
    aliasToTable[table.toLowerCase()] = table;
  }
  return { tables, aliasToTable };
};

const resolveColumnTable = (alias, column, aliasToTable, tables) => {
  if (alias) {
    const table = aliasToTable[alias.toLowerCase()];
    return table ? [table] : [];
  }
  const owners = tables.filter((t) => {
    if (PUSHDOWN_COLUMNS[t]?.[column]) return true;
    if (t.startsWith("archive_") && ARCHIVE_COLUMNS[column]) return true;
    return false;
  });
  return owners.length ? owners : tables.length === 1 ? tables : [];
};

const columnsForTable = (tableName) => {
  if (PUSHDOWN_COLUMNS[tableName]) return PUSHDOWN_COLUMNS[tableName];
  if (String(tableName).startsWith("archive_")) return ARCHIVE_COLUMNS;
  if (String(tableName).startsWith("form_")) return FORM_TABLE_COLUMNS;
  return null;
};

const mongoValue = (values) => {
  if (!values.length) return null;
  if (values.length === 1) return values[0];
  return { $in: values };
};

/**
 * WHERE의 등호·IN만 테이블별 Mongo 필터로 변환.
 * OR가 있으면 빈 객체(푸시 없음).
 * @returns {Record<string, object>}
 */
export const extractPushdownFilters = (sql) => {
  const byTable = {};
  if (whereHasOr(sql)) return byTable;
  const where = extractWhereClause(sql);
  if (!where) return byTable;
  const { tables, aliasToTable } = extractTableAliases(sql);

  const add = (table, mongoField, values) => {
    if (!table || !mongoField || !values.length) return;
    const prev = byTable[table] || {};
    if (prev[mongoField] != null) {
      const existing = prev[mongoField];
      const list = existing?.$in
        ? existing.$in
        : [existing];
      const merged = [...new Set([...list, ...values])];
      byTable[table] = { ...prev, [mongoField]: mongoValue(merged) };
      return;
    }
    byTable[table] = { ...prev, [mongoField]: mongoValue(values) };
  };

  const eqRe =
    /(?:(\w+)\.)?(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))\s*=\s*'((?:''|[^'])*)'/g;
  let m;
  while ((m = eqRe.exec(where))) {
    const column = m[2] || m[3] || m[4];
    const values = [unescapeSqlString(m[5])];
    for (const table of resolveColumnTable(m[1], column, aliasToTable, tables)) {
      const map = columnsForTable(table);
      if (map?.[column]) add(table, map[column], values);
    }
  }

  const inRe =
    /(?:(\w+)\.)?(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))\s+in\s*\(([^)]*)\)/gi;
  while ((m = inRe.exec(where))) {
    const column = m[2] || m[3] || m[4];
    const inner = m[5] || "";
    if (inner.replace(SQL_STRING, "").replace(/[,\s]/g, "")) continue;
    const values = parseInList(inner);
    for (const table of resolveColumnTable(m[1], column, aliasToTable, tables)) {
      const map = columnsForTable(table);
      if (map?.[column]) add(table, map[column], values);
    }
  }

  return byTable;
};

const UNPUSHABLE =
  /\b(like|between|exists|not\s+in|is\s+null|is\s+not\s+null)\b|[<>]|!=|<>/i;

export const isWhereFullyPushable = (sql, tableName) => {
  if (whereHasOr(sql)) return false;
  const where = extractWhereClause(sql);
  if (!where) return true;
  if (UNPUSHABLE.test(maskStrings(where))) return false;
  const inInner = /\bin\s*\(([^)]*)\)/gi;
  let inMatch;
  while ((inMatch = inInner.exec(where))) {
    if ((inMatch[1] || "").replace(SQL_STRING, "").replace(/[,\s]/g, "")) {
      return false;
    }
  }
  const map = columnsForTable(tableName);
  if (!map) return false;
  const colRe =
    /(?:(\w+)\.)?(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))\s*(?:=|\bin\b)/gi;
  let m;
  let saw = false;
  while ((m = colRe.exec(where))) {
    saw = true;
    const column = m[2] || m[3] || m[4];
    if (!map[column]) return false;
  }
  return saw || !maskStrings(where).replace(/\b(and|in)\b/gi, "").replace(/[()\s]/g, "");
};

const hasJoin = (sql) =>
  /\bjoin\b/i.test(maskStrings(stripSqlComments(sql)));

const hasGroupBy = (sql) =>
  /\bgroup\s+by\b/i.test(maskStrings(stripSqlComments(sql)));

/**
 * 단일 테이블 SELECT COUNT(*) 이면 테이블 이름, 아니면 null.
 */
export const parseSimpleCountTable = (sql) => {
  const stripped = stripSqlComments(sql).replace(/;+\s*$/, "").trim();
  if (hasJoin(stripped) || hasGroupBy(stripped)) return null;
  const m = stripped.match(
    /^\s*select\s+count\s*\(\s*\*\s*\)\s+from\s+(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))(?:\s+(?:as\s+)?[A-Za-z_][A-Za-z0-9_]*)?\s*(?:where\b[\s\S]*)?(?:limit\b[\s\S]*)?$/i
  );
  if (!m) return null;
  return m[1] || m[2] || m[3] || null;
};

export const canCountInMongo = (sql, tableName) =>
  Boolean(tableName && parseSimpleCountTable(sql) === tableName && isWhereFullyPushable(sql, tableName));

export const normalizeSeasonScope = (raw) => {
  const v = String(raw || "").trim();
  if (v === "activated" || v === "school" || v === "archive") return "activated";
  if (v === "season") return "season";
  return "current";
};

export const normalizeSearchGrade = (raw) => String(raw || "").trim();

/**
 * 활성 학기 id 목록과 요청 id로 최종 season id를 고른다.
 */
export const pickResolvedSeasonIds = ({
  scope,
  currentId,
  activatedIds = [],
  requestedId,
}) => {
  const current = currentId ? [currentId] : [];
  const activated = (activatedIds || []).filter(Boolean);
  if (scope === "activated") return activated.length ? activated : current;
  if (scope === "season") {
    const want = requestedId != null ? String(requestedId) : "";
    const hit = activated.find((id) => String(id) === want);
    return hit ? [hit] : current;
  }
  return current;
};
