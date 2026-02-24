/**
 * MergeEngine v2
 * @description Alt Docs 머지 템플릿 파싱 및 렌더링
 *
 * 문법:
 *   ── 기본 ──
 *   {{#sheet 시트명}}                         — 사용할 시트 선언 (문서 상단)
 *   {{변수}}                                  — 단일 값 치환 (필드 label 기준)
 *   {{변수|date:YYYY.MM.DD}}                 — 날짜 포맷
 *   {{변수|number:,}}                        — 숫자 포맷 (천 단위 쉼표)
 *   {{_respondentName}}                      — 응답자 이름
 *   {{_respondentId}}                        — 응답자 ID
 *   {{_submittedAt}}                         — 제출일
 *   {{_updatedAt}}                           — 수정일
 *   {{_count}}                               — 행 개수
 *
 *   ── 반복/테이블 ──
 *   {{#each}}...{{/each}}                    — 모든 행 반복
 *   {{_index}}                               — 반복 내 행 번호 (1부터)
 *   {{#table col1, col2, ...}}               — 마크다운 테이블
 *
 *   ── 필터/정렬 ──
 *   {{#filter 필드 == "값"}}                  — 행 필터 (AND 결합)
 *   {{#sort 필드 asc|desc}}                  — 행 정렬
 *
 *   ── 집계 ──
 *   {{#sum 필드}}                             — 합계
 *   {{#avg 필드}}                             — 평균
 *   {{#min 필드}}                             — 최솟값
 *   {{#max 필드}}                             — 최댓값
 *   {{#unique 필드}}                          — 고유값 목록
 *
 *   ── 조건 ──
 *   {{#if 필드 == "값"}}...{{/if}}            — 조건부 표시
 *   {{#if 필드 == "값"}}...{{#else}}...{{/if}} — 조건/대체
 *   연산자: == != > < >= <= contains isEmpty isNotEmpty
 *
 *   ── 그룹 ──
 *   {{#group 필드}}...{{/group}}              — 필드값 기준 그룹핑
 *   {{_groupValue}}                          — 현재 그룹 값
 *   {{_groupCount}}                          — 현재 그룹 행 수
 */

// ─── Exports ─────────────────────────────────────────────

/**
 * 템플릿에서 시트명 추출
 * @param {string} content - 게시글 content
 * @returns {{ sheetName: string|null, body: string }}
 */
export function parseSheetDeclaration(content) {
  const match = content.match(/\{\{#sheet\s+(.+?)\}\}/);
  if (!match) return { sheetName: null, body: content };
  const sheetName = match[1].trim();
  const body = content.replace(/\{\{#sheet\s+.+?\}\}\s*/, "").trim();
  return { sheetName, body };
}

/**
 * 머지 렌더링
 * @param {string} body - 시트 선언 제거 후 본문
 * @param {Array} rows - AltSheetRow 배열
 * @param {Array} fields - AltForm.fields
 * @returns {string} 렌더링된 문자열
 */
export function renderMerge(body, rows, fields) {
  const labelMap = buildLabelMap(fields);
  let activeRows = [...rows];
  let result = body;

  // 1. {{#filter}} — 행 필터링
  const { filters, body: afterFilter } = parseFilters(result);
  result = afterFilter;
  activeRows = applyFilters(activeRows, filters, labelMap);

  // 2. {{#sort}} — 행 정렬
  const { sorts, body: afterSort } = parseSorts(result);
  result = afterSort;
  activeRows = applySorts(activeRows, sorts, labelMap);

  // 3. {{_count}}
  result = result.replace(/\{\{_count\}\}/g, String(activeRows.length));

  // 4. 집계 함수
  result = processAggregates(result, activeRows, labelMap);

  // 5. {{#unique}}
  result = processUnique(result, activeRows, labelMap);

  // 6. {{#group}} (내부 블록 자체 처리)
  result = processGroups(result, activeRows, labelMap);

  // 7. {{#table}}
  result = processTables(result, activeRows, labelMap);

  // 8. {{#each}} (행별 {{#if}} + 변수 처리)
  result = processEach(result, activeRows, labelMap);

  // 9. 글로벌 {{#if}} (첫 행 기준)
  if (activeRows.length > 0) {
    result = processConditionals(result, activeRows[0], labelMap);
  }

  // 10. 나머지 단일 변수 (첫 행 기준)
  if (activeRows.length > 0) {
    result = replaceVariables(result, activeRows[0], labelMap);
  }

  return result;
}

/**
 * 머지 실패 시 템플릿 태그 정리
 * @param {string} body - 시트 선언 제거 후 본문
 * @returns {string} 태그가 제거된 문자열
 */
export function stripMergeTags(body) {
  let result = body;
  result = result.replace(/\{\{#filter\s+.+?\}\}\s*/g, "");
  result = result.replace(/\{\{#sort\s+.+?\}\}\s*/g, "");
  result = result.replace(/\{\{#(sum|avg|min|max)\s+.+?\}\}/g, "");
  result = result.replace(/\{\{#unique\s+.+?\}\}/g, "");
  result = result.replace(/\{\{#group\s+.+?\}\}[\s\S]*?\{\{\/group\}\}/g, "");
  result = result.replace(/\{\{#if\s+.+?\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  result = result.replace(/\{\{#table\s+.+?\}\}/g, "");
  result = result.replace(/\{\{#each\}\}[\s\S]*?\{\{\/each\}\}/g, "");
  result = result.replace(/\{\{.+?\}\}/g, "");
  return result.trim();
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * 필드 label → fieldId 매핑 생성
 * @param {Array} fields - AltForm.fields
 * @returns {Map<string, string>} label → fieldId
 */
function buildLabelMap(fields) {
  const map = new Map();
  for (const field of fields) {
    map.set(field.label, field._id.toString());
  }
  return map;
}

/**
 * 행에서 필드 값 조회 (라벨 또는 시스템 변수)
 */
function getFieldValue(row, label, labelMap) {
  if (label === "_respondentName") return row._respondentName || "";
  if (label === "_respondentId") return row._respondentId || "";
  if (label === "_submittedAt") return row._submittedAt || "";
  if (label === "_updatedAt") return row._updatedAt || "";

  const fieldId = labelMap.get(label);
  if (fieldId && row.data) {
    const val =
      row.data instanceof Map ? row.data.get(fieldId) : row.data[fieldId];
    return val !== undefined && val !== null ? val : "";
  }
  return "";
}

// ─── Format Pipes ────────────────────────────────────────

function formatDate(value, fmt) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);

  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");

  if (!fmt) return `${y}-${m}-${day}`;

  return fmt
    .replace("YYYY", y)
    .replace("YY", y.slice(-2))
    .replace("MM", m)
    .replace("DD", day)
    .replace("HH", h)
    .replace("mm", min)
    .replace("ss", sec);
}

function formatNumber(value, fmt) {
  const num = Number(value);
  if (isNaN(num)) return String(value);

  if (fmt === ",") return num.toLocaleString("ko-KR");

  const decimals = parseInt(fmt, 10);
  if (!isNaN(decimals)) {
    return num
      .toFixed(decimals)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return num.toLocaleString("ko-KR");
}

function applyPipe(value, pipeExpr) {
  const colonIdx = pipeExpr.indexOf(":");
  const name = (
    colonIdx >= 0 ? pipeExpr.substring(0, colonIdx) : pipeExpr
  ).trim();
  const arg = colonIdx >= 0 ? pipeExpr.substring(colonIdx + 1).trim() : "";

  switch (name) {
    case "date":
      return formatDate(value, arg);
    case "number":
      return formatNumber(value, arg);
    default:
      return String(value ?? "");
  }
}

function applyPipes(value, pipes) {
  let result = value;
  for (const p of pipes) {
    result = applyPipe(result, p.trim());
  }
  return String(result);
}

// ─── Condition ───────────────────────────────────────────

/**
 * 조건식 파싱
 * @param {string} expr - "필드 == 값" 형태
 */
function parseCondition(expr) {
  const t = expr.trim();

  // 단항: "필드 isEmpty", "필드 isNotEmpty"
  if (t.endsWith(" isEmpty")) {
    return { field: t.slice(0, -8).trim(), operator: "isEmpty", value: "" };
  }
  if (t.endsWith(" isNotEmpty")) {
    return { field: t.slice(0, -11).trim(), operator: "isNotEmpty", value: "" };
  }

  // 이항 (긴 연산자 먼저 매칭)
  const ops = ["contains", "==", "!=", ">=", "<=", ">", "<"];
  for (const op of ops) {
    const idx = t.indexOf(` ${op} `);
    if (idx >= 0) {
      const field = t.substring(0, idx).trim();
      let value = t.substring(idx + op.length + 2).trim();
      if (value.startsWith('"') && value.endsWith('"'))
        value = value.slice(1, -1);
      return { field, operator: op, value };
    }
  }

  return null;
}

function evaluateCondition(leftValue, operator, rightValue) {
  const left = String(leftValue ?? "");
  const right = String(rightValue ?? "");

  switch (operator) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return Number(left) > Number(right);
    case "<":
      return Number(left) < Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<=":
      return Number(left) <= Number(right);
    case "contains":
      return left.includes(right);
    case "isEmpty":
      return left === "";
    case "isNotEmpty":
      return left !== "";
    default:
      return false;
  }
}

// ─── Filter & Sort ───────────────────────────────────────

function parseFilters(body) {
  const filters = [];
  const cleaned = body.replace(/\{\{#filter\s+(.+?)\}\}\s*/g, (_, expr) => {
    const cond = parseCondition(expr);
    if (cond) filters.push(cond);
    return "";
  });
  return { filters, body: cleaned };
}

function applyFilters(rows, filters, labelMap) {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every(({ field, operator, value }) =>
      evaluateCondition(getFieldValue(row, field, labelMap), operator, value)
    )
  );
}

function parseSorts(body) {
  const sorts = [];
  const cleaned = body.replace(
    /\{\{#sort\s+(.+?)\s+(asc|desc)\}\}\s*/g,
    (_, field, dir) => {
      sorts.push({ field: field.trim(), direction: dir });
      return "";
    }
  );
  return { sorts, body: cleaned };
}

function applySorts(rows, sorts, labelMap) {
  if (sorts.length === 0) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const { field, direction } of sorts) {
      const va = getFieldValue(a, field, labelMap);
      const vb = getFieldValue(b, field, labelMap);
      const na = Number(va);
      const nb = Number(vb);
      const cmp =
        !isNaN(na) && !isNaN(nb)
          ? na - nb
          : String(va).localeCompare(String(vb), "ko");
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
  return sorted;
}

// ─── Block Processors ────────────────────────────────────

/**
 * {{#if condition}}...{{#else}}...{{/if}}
 * 중첩 지원 (안쪽부터 처리)
 */
function processConditionals(template, row, labelMap) {
  let result = template;
  let safety = 0;

  while (safety++ < 50) {
    // 가장 안쪽 {{#if}} 블록 매칭 (내부에 다른 {{#if}}가 없는 블록)
    const m = result.match(
      /\{\{#if\s+(.+?)\}\}((?:(?!\{\{#if\s)[\s\S])*?)\{\{\/if\}\}/
    );
    if (!m) break;

    const [full, condExpr, content] = m;
    const cond = parseCondition(condExpr);
    if (!cond) {
      result = result.replace(full, content);
      continue;
    }

    const fieldValue = getFieldValue(row, cond.field, labelMap);
    const isTrue = evaluateCondition(fieldValue, cond.operator, cond.value);
    const elseIdx = content.indexOf("{{#else}}");
    const replacement =
      elseIdx >= 0
        ? isTrue
          ? content.substring(0, elseIdx)
          : content.substring(elseIdx + 9)
        : isTrue
          ? content
          : "";

    result = result.replace(full, replacement);
  }

  return result;
}

/**
 * {{#sum 필드}}, {{#avg 필드}}, {{#min 필드}}, {{#max 필드}}
 */
function processAggregates(template, rows, labelMap) {
  return template.replace(
    /\{\{#(sum|avg|min|max)\s+(.+?)\}\}/g,
    (match, func, label) => {
      const nums = rows
        .map((r) => Number(getFieldValue(r, label.trim(), labelMap)))
        .filter((n) => !isNaN(n));
      if (nums.length === 0) return "0";

      switch (func) {
        case "sum":
          return String(nums.reduce((a, b) => a + b, 0));
        case "avg":
          return String(
            Math.round(
              (nums.reduce((a, b) => a + b, 0) / nums.length) * 100
            ) / 100
          );
        case "min":
          return String(Math.min(...nums));
        case "max":
          return String(Math.max(...nums));
        default:
          return match;
      }
    }
  );
}

/**
 * {{#unique 필드}} — 쉼표 구분 고유값
 */
function processUnique(template, rows, labelMap) {
  return template.replace(/\{\{#unique\s+(.+?)\}\}/g, (_, label) => {
    const seen = new Set();
    for (const row of rows) {
      const v = String(getFieldValue(row, label.trim(), labelMap));
      if (v) seen.add(v);
    }
    return [...seen].join(", ");
  });
}

/**
 * {{#group 필드}}...{{/group}}
 * 그룹 내 {{#each}}, {{#table}}, 집계, 조건 지원
 */
function processGroups(template, rows, labelMap) {
  return template.replace(
    /\{\{#group\s+(.+?)\}\}([\s\S]*?)\{\{\/group\}\}/g,
    (_, label, inner) => {
      const trimmed = label.trim();

      // 그룹핑 (등장 순서 유지)
      const groupMap = new Map();
      for (const row of rows) {
        const key = String(getFieldValue(row, trimmed, labelMap));
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key).push(row);
      }

      let output = "";
      for (const [groupValue, groupRows] of groupMap) {
        let block = inner;
        block = block.replace(/\{\{_groupValue\}\}/g, groupValue);
        block = block.replace(/\{\{_groupCount\}\}/g, String(groupRows.length));
        block = block.replace(/\{\{_count\}\}/g, String(groupRows.length));

        block = processAggregates(block, groupRows, labelMap);
        block = processUnique(block, groupRows, labelMap);
        block = processTables(block, groupRows, labelMap);
        block = processEach(block, groupRows, labelMap);

        if (groupRows.length > 0) {
          block = processConditionals(block, groupRows[0], labelMap);
          block = replaceVariables(block, groupRows[0], labelMap);
        }
        output += block;
      }

      return output;
    }
  );
}

/**
 * {{#table col1, col2, ...}}
 */
function processTables(template, rows, labelMap) {
  return template.replace(
    /\{\{#table\s+(.+?)\}\}/g,
    (match, colList) => {
      const cols = colList.split(",").map((c) => c.trim());
      if (rows.length === 0) return "(데이터 없음)";

      // 헤더 라벨
      const headers = cols.map((c) => {
        if (c === "_index") return "#";
        if (c === "_respondentName") return "응답자";
        if (c === "_respondentId") return "ID";
        if (c === "_submittedAt") return "제출일";
        if (c === "_updatedAt") return "수정일";
        return c;
      });
      let table = "| " + headers.join(" | ") + " |\n";
      table += "| " + cols.map(() => "---").join(" | ") + " |\n";

      rows.forEach((row, idx) => {
        const cells = cols.map((col) => {
          if (col === "_index") return String(idx + 1);
          return String(getFieldValue(row, col, labelMap));
        });
        table += "| " + cells.join(" | ") + " |\n";
      });

      return table;
    }
  );
}

/**
 * {{#each}}...{{/each}} — _index 및 행별 {{#if}} 지원
 */
function processEach(template, rows, labelMap) {
  return template.replace(
    /\{\{#each\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, inner) => {
      if (rows.length === 0) return "";
      return rows
        .map((row, idx) => {
          let r = processConditionals(inner, row, labelMap);
          r = replaceVariables(r, row, labelMap, idx + 1);
          return r;
        })
        .join("");
    }
  );
}

/**
 * 단일 변수 치환 (파이프 포맷 지원)
 * @param {string} template
 * @param {Object} row
 * @param {Map} labelMap
 * @param {number} [index] - {{_index}} 값 (1부터)
 */
function replaceVariables(template, row, labelMap, index) {
  return template.replace(/\{\{(.+?)\}\}/g, (match, varExpr) => {
    const parts = varExpr.split("|");
    const varName = parts[0].trim();

    // 블록 태그 스킵
    if (varName.startsWith("#") || varName.startsWith("/")) return match;

    // _index
    if (varName === "_index") {
      const val = index != null ? String(index) : "";
      return parts.length > 1 ? applyPipes(val, parts.slice(1)) : val;
    }

    // 시스템 변수 또는 필드 라벨
    const sysVars = [
      "_respondentName",
      "_respondentId",
      "_submittedAt",
      "_updatedAt",
    ];
    if (sysVars.includes(varName) || labelMap.has(varName)) {
      const value = getFieldValue(row, varName, labelMap);
      return parts.length > 1
        ? applyPipes(value, parts.slice(1))
        : String(value);
    }

    return match; // 알 수 없는 변수 → 원본 유지
  });
}
