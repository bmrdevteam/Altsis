/**
 * Alter 검색 — 결과 표 숫자 열을 서버가 합산해 요약에 넘긴다.
 * LLM이 표본을 다시 더하지 않게 한다.
 */

const UNIT_SUFFIX =
  /(?:시간|시수|학점|점|명|개|건|원|회|hours?|hrs?|pts?)$/i;

const SKIP_COL =
  /(^|_)(id|login|index|json)(_|$)|_id$|일자|기간|날짜|date|^start$|^end$|created|updated|^year$|^term$|학년도|^학기$|^학년$|student_grade|^grade$|entry_index/;

const NUMERIC_HINT =
  /시간|시수|점수|학점|횟수|인원|합계|총점|point|score|hour|credit|^count$|^sum$|^avg$|평균/;

const looksLikeYears = (nums) =>
  nums.length > 0 &&
  nums.every((n) => Number.isInteger(n) && n >= 1900 && n <= 2100);

const looksLikeIds = (nums) =>
  nums.length > 0 && nums.every((n) => Number.isInteger(n) && Math.abs(n) >= 100000);

const columnName = (col) => {
  if (typeof col === "string") return col;
  return String(col?.key || col?.label || "").trim();
};

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export const parseNumericCell = (value) => {
  if (typeof value === "boolean") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const stripped = raw.replace(/,/g, "").replace(UNIT_SUFFIX, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(stripped)) return null;
  const n = Number(stripped);
  return Number.isFinite(n) ? n : null;
};

/**
 * @param {number} n
 * @returns {string}
 */
export const formatAggNumber = (n) => {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 1000) / 1000;
  if (Object.is(rounded, -0)) return "0";
  return String(rounded);
};

/**
 * @param {Array<string|{key?: string, label?: string}>} columns
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<{column: string, count: number, skipped: number, sum: number, avg: number, min: number, max: number}>}
 */
export const summarizeNumericColumns = (columns, rows) => {
  const cols = (columns || []).map(columnName).filter(Boolean);
  const list = Array.isArray(rows) ? rows : [];
  const stats = [];
  for (const column of cols) {
    if (SKIP_COL.test(column)) continue;
    const nums = [];
    let empty = 0;
    for (const row of list) {
      const raw = row?.[column];
      if (raw == null || String(raw).trim() === "") {
        empty += 1;
        continue;
      }
      const n = parseNumericCell(raw);
      if (n != null) nums.push(n);
    }
    if (!nums.length) continue;
    const nonEmpty = list.length - empty;
    const ratio = nums.length / Math.max(nonEmpty, 1);
    const hinted = NUMERIC_HINT.test(column);
    if (!hinted && ratio < 0.6) continue;
    if (!hinted && looksLikeYears(nums)) continue;
    if (!hinted && looksLikeIds(nums)) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    stats.push({
      column,
      count: nums.length,
      skipped: Math.max(0, nonEmpty - nums.length),
      sum,
      avg: sum / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
    });
  }
  return stats;
};

/**
 * @param {ReturnType<typeof summarizeNumericColumns>} stats
 * @param {{ rowCount?: number, truncated?: boolean }} [meta]
 * @returns {string}
 */
export const formatAggregateNote = (stats, meta = {}) => {
  if (!stats?.length) return "";
  const lines = stats.map((s) => {
    const skip = s.skipped > 0 ? `, 숫자 아님 ${s.skipped}건` : "";
    return `- "${s.column}": 합=${formatAggNumber(s.sum)}, 유효 ${s.count}건, 평균=${formatAggNumber(s.avg)}, 최소=${formatAggNumber(s.min)}, 최대=${formatAggNumber(s.max)}${skip}`;
  });
  const n = Number.isFinite(meta.rowCount) ? `${meta.rowCount}행 ` : "";
  const trunc = meta.truncated
    ? " 저장·표시가 잘린 경우 아래 합계는 저장된 행만 해당합니다."
    : "";
  return `서버가 결과 표 ${n}전체에서 계산한 값입니다. 합·평균·건수는 아래 숫자만 쓰세요. 표본을 다시 더하거나 어림하지 마세요.${trunc}
${lines.join("\n")}`;
};

/**
 * @param {ReturnType<typeof summarizeNumericColumns>} stats
 * @returns {string}
 */
export const formatFallbackTotals = (stats) => {
  if (!stats?.length) return "";
  return ` ${stats
    .map((s) => `${s.column} 합계 ${formatAggNumber(s.sum)}`)
    .join(", ")}.`;
};
