/**
 * Alter 검색 — 범위 안의 실제 컬럼·값 사전과 선필터 게이트.
 * LLM이 없는 키·학년 표기를 지어 내지 못하게 한다.
 */

import { normalizeSeasonScope } from "./alterSearchPushdown.js";

export const EVAL_RESERVED_COLUMNS = new Set([
  "id",
  "syllabus_id",
  "class_title",
  "student_id",
  "student_login",
  "student_name",
  "student_grade",
  "evaluation_json",
  "season_id",
  "year",
  "term",
]);

const DICT_MONGO_FIELDS = {
  grade: "grades",
  studentGrade: "studentGrades",
  year: "years",
  term: "terms",
  role: "roles",
};

const asList = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (value.$in && Array.isArray(value.$in)) return value.$in;
  return [value];
};

const mongoValue = (values) => {
  if (!values.length) return null;
  if (values.length === 1) return values[0];
  return { $in: values };
};

const allowedSetForField = (mongoField, dict) => {
  if (!dict) return new Set();
  if (mongoField === "studentGrade") {
    const grades = dict.studentGrades?.length ? dict.studentGrades : dict.grades;
    return new Set((grades || []).map(String));
  }
  if (mongoField === "grade") {
    const grades = dict.grades?.length ? dict.grades : dict.studentGrades;
    return new Set((grades || []).map(String));
  }
  const key = DICT_MONGO_FIELDS[mongoField];
  return new Set((dict[key] || []).map(String));
};

/**
 * 양식 항목에서 예약명과 겹치지 않는 평가 열을 만든다.
 * @param {Array<{ label?: string, options?: string[] }>} items
 * @param {Set<string>|null} allowedLabels
 */
export const evalColumnsFromItems = (items, allowedLabels = null) => {
  const cols = [];
  const seen = new Set();
  for (const item of items || []) {
    const label = String(item?.label || "").trim();
    if (!label || seen.has(label) || EVAL_RESERVED_COLUMNS.has(label)) continue;
    if (allowedLabels && !allowedLabels.has(label)) continue;
    seen.add(label);
    const options = (Array.isArray(item.options) ? item.options : [])
      .map((o) => String(o || "").trim())
      .filter(Boolean)
      .slice(0, 16);
    cols.push({
      name: label,
      type: "TEXT",
      comment: options.length
        ? `평가 항목(선택: ${options.join(", ")})`
        : "평가 항목",
      options,
    });
  }
  return cols;
};

/**
 * 펼친 평가 열에 행 값을 넣는다. 없는 칸은 빈 문자열.
 * @param {Record<string, unknown>} evaluation
 * @param {Array<{ name: string }>} evalColumns
 */
export const pickEvalColumnValues = (evaluation, evalColumns) => {
  const src = evaluation && typeof evaluation === "object" ? evaluation : {};
  const out = {};
  for (const col of evalColumns || []) {
    const raw = src[col.name];
    out[col.name] = raw == null || raw === "" ? "" : raw;
  }
  return out;
};

/**
 * peek 사전에 없는 grade/year/term/role 리터럴은 선필터에서 뺀다.
 * @param {Record<string, object>} filtersByTable
 * @param {{ grades?: string[], studentGrades?: string[], years?: string[], terms?: string[], roles?: string[] }} dict
 */
export const samePushdown = (a, b) =>
  JSON.stringify(a || {}) === JSON.stringify(b || {});

export const filterPushdownByDict = (filtersByTable, dict) => {
  if (!filtersByTable || typeof filtersByTable !== "object") return {};
  const out = {};
  for (const [table, filter] of Object.entries(filtersByTable)) {
    if (!filter || typeof filter !== "object") continue;
    const next = {};
    for (const [mongoField, value] of Object.entries(filter)) {
      if (!DICT_MONGO_FIELDS[mongoField]) {
        next[mongoField] = value;
        continue;
      }
      const allowed = allowedSetForField(mongoField, dict);
      if (!allowed.size) continue;
      const kept = asList(value)
        .map((v) => String(v))
        .filter((v) => allowed.has(v));
      const narrowed = mongoValue(kept);
      if (narrowed != null) next[mongoField] = narrowed;
    }
    if (Object.keys(next).length) out[table] = next;
  }
  return out;
};

export const formatSearchSchemaHint = (schema, seasonScope = "current") => {
  if (!schema) return "";
  const scope = normalizeSeasonScope(seasonScope);
  const evalLines = (schema.evalColumns || []).map((c) => {
    const opts = (c.options || []).length ? ` 값: ${c.options.join(", ")}` : "";
    return `- "${c.name}"${opts}`;
  });
  const lines = [
    "## 실제 컬럼 값 (추측 금지)",
    `registrations 행 ${schema.count ?? 0}건`,
    `grade: ${(schema.grades || []).join(", ") || "(없음)"}`,
    `student_grade: ${(schema.studentGrades || []).join(", ") || "(없음)"}`,
    `year: ${(schema.years || []).join(", ") || "(없음)"}`,
    `term: ${(schema.terms || []).join(", ") || "(없음)"}`,
    `role: ${(schema.roles || []).join(", ") || "(없음)"}`,
  ];
  if (evalLines.length) {
    lines.push("평가 열 (enrollment_evaluations). JSON 키를 추측하지 마세요:");
    lines.push(...evalLines);
  }
  const formTables = schema.formTables || [];
  if (formTables.length) {
    lines.push("보드 활동 표 (항목 집계는 이 표의 한글 열. answers_json 키를 추측하지 마세요):");
    for (const table of formTables) {
      const cols = (table.columns || [])
        .map((c) => {
          const opts = (c.options || []).length
            ? `(선택: ${c.options.join(", ")})`
            : "";
          return `${c.name}${opts}`;
        })
        .join(", ");
      lines.push(
        `- ${table.name}: 제목=${table.title || ""}${cols ? `, 열=${cols}` : ""}`
      );
    }
  }
  if ((schema.overflowFormTitles || []).length) {
    lines.push(
      `양식 표 한도 초과 제목(forms에서 찾으세요): ${schema.overflowFormTitles.join(", ")}`
    );
  }
  lines.push(
    "enrollments·enrollment_evaluations 한 행은 수강 1건입니다. 학생 수는 COUNT(DISTINCT student_id), 수강 건수는 COUNT(*)입니다."
  );
  lines.push(
    "조건·GROUP BY에는 위 목록과 스키마에 있는 값·열만 쓰세요. 목록에 없는 표기나 JSON_EXTRACT(..., '$.grade')처럼 없는 키를 추측하지 마세요."
  );
  if (scope === "current") {
    lines.push(
      "현재 학기 행만 이미 들어 있습니다. 같은 학기를 year/term으로 다시 좁히지 마세요."
    );
  } else {
    lines.push(
      "선택한 학기 범위의 행만 이미 들어 있습니다. year/term으로 다시 좁히지 마세요."
    );
  }
  return lines.join("\n");
};

/** 등록 peek만 있을 때 쓰는 별칭 */
export const formatRegistrationValueHint = (dims, seasonScope = "current") =>
  formatSearchSchemaHint(dims, seasonScope);
