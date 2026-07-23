/**
 * MergeEngine v2 (stable core)
 * @description Alt Docs 머지 — 안정 코어만 지원
 *
 * 문법:
 *   {{#sheet 시트명}}
 *   {{변수}} {{변수|date:YYYY.MM.DD}} {{변수|number:,}}
 *   {{_respondentName}} {{_respondentId}} {{_submittedAt}} {{_updatedAt}} {{_count}} {{_index}}
 *   {{#filter …}} {{#sort …}}
 *   {{#table col1, col2, ...}}
 *   {{#each}}...{{/each}}
 *   {{#timetable date=날짜필드 period=교시필드}}칸템플릿{{/timetable}}
 *
 * 제거됨 (런타임 strip): {{#form}}, {{#input}}, {{#if}}, {{#group}}, {{#sum|avg|min|max|unique}}
 */

import {
  buildTimetableSlots,
  buildWeekGrid,
  parseTimetableAttrs,
  weekDates,
} from "./timetableSlots.js";

export const MERGE_MAX_ROWS = 2000;
export const MERGE_MAX_OUTPUT = 1_000_000; // 1MB chars

/**
 * @param {string} content
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
 * 미지원 문법 제거 (form/input/if/group/집계). if 블록은 내용 포함 전체 제거.
 * @returns {{ body: string, stripped: boolean }}
 */
export function stripUnsupportedMergeTags(body) {
  let result = body;
  const before = result;
  result = result.replace(/\{\{#form\s+.+?\}\}\s*/g, "");
  result = result.replace(/\{\{#input\s+.+?\}\}/g, "");
  // if / else /if (비탐욕, 반복)
  let safety = 0;
  while (safety++ < 50 && /\{\{#if\s/.test(result)) {
    const next = result.replace(
      /\{\{#if\s+.+?\}\}[\s\S]*?\{\{\/if\}\}/g,
      ""
    );
    if (next === result) break;
    result = next;
  }
  result = result.replace(/\{\{#group\s+.+?\}\}[\s\S]*?\{\{\/group\}\}/g, "");
  result = result.replace(/\{\{#(sum|avg|min|max|unique)\s+.+?\}\}/g, "");
  result = result.replace(/\{\{_groupValue\}\}/g, "");
  result = result.replace(/\{\{_groupCount\}\}/g, "");
  return { body: result, stripped: result !== before };
}

/**
 * @returns {{ content: string, truncated: boolean, stripped: boolean }}
 */
export function renderMerge(body, rows, fields) {
  const { body: cleaned, stripped } = stripUnsupportedMergeTags(body);
  const labelMap = buildLabelMap(fields || []);
  let activeRows = Array.isArray(rows) ? [...rows] : [];
  let result = cleaned;
  let truncated = false;

  const { filters, body: afterFilter } = parseFilters(result);
  result = afterFilter;
  activeRows = applyFilters(activeRows, filters, labelMap);

  const { sorts, body: afterSort } = parseSorts(result);
  result = afterSort;
  activeRows = applySorts(activeRows, sorts, labelMap);

  if (activeRows.length > MERGE_MAX_ROWS) {
    activeRows = activeRows.slice(0, MERGE_MAX_ROWS);
    truncated = true;
  }

  result = result.replace(/\{\{_count\}\}/g, () => String(activeRows.length));

  result = processTables(result, activeRows, labelMap);
  result = processEach(result, activeRows, labelMap);
  result = processTimetables(result, activeRows, fields || [], labelMap);

  if (activeRows.length > 0) {
    result = replaceVariables(result, activeRows[0], labelMap);
  }

  if (result.length > MERGE_MAX_OUTPUT) {
    result =
      result.slice(0, MERGE_MAX_OUTPUT) +
      "\n\n_(출력이 너무 길어 일부만 표시됩니다.)_";
    truncated = true;
  }

  return { content: result, truncated, stripped };
}

/**
 * 머지 실패 시 템플릿 태그 정리
 */
export function stripMergeTags(body) {
  let result = stripUnsupportedMergeTags(body).body;
  result = result.replace(/\{\{#filter\s+.+?\}\}\s*/g, "");
  result = result.replace(/\{\{#sort\s+.+?\}\}\s*/g, "");
  result = result.replace(/\{\{#table\s+.+?\}\}/g, "");
  result = result.replace(/\{\{#each\}\}[\s\S]*?\{\{\/each\}\}/g, "");
  result = result.replace(
    /\{\{#timetable\s+.+?\}\}[\s\S]*?\{\{\/timetable\}\}/g,
    ""
  );
  result = result.replace(/\{\{.+?\}\}/g, "");
  return result.trim();
}

function buildLabelMap(fields) {
  const map = new Map();
  for (const field of fields) {
    map.set(field.label, field._id.toString());
  }
  return map;
}

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

function stringifyValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Y" : "N";
  if (typeof value !== "object") return String(value);

  if (Array.isArray(value)) {
    return value.map((v) => stringifyValue(v)).join(", ");
  }

  if (value.userName !== undefined) return value.userName;

  if (value.approver !== undefined) {
    const name = value.approver?.userName || "";
    const statusMap = { approved: "승인", rejected: "반려", pending: "대기" };
    const status = statusMap[value.status] || value.status || "";
    return status ? `${name} (${status})` : name;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

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
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
      return stringifyValue(value ?? "");
  }
}

function applyPipes(value, pipes) {
  let result = value;
  for (const p of pipes) {
    result = applyPipe(result, p.trim());
  }
  return stringifyValue(result);
}

function parseCondition(expr) {
  const t = expr.trim();

  if (t.endsWith(" isEmpty")) {
    return { field: t.slice(0, -8).trim(), operator: "isEmpty", value: "" };
  }
  if (t.endsWith(" isNotEmpty")) {
    return { field: t.slice(0, -11).trim(), operator: "isNotEmpty", value: "" };
  }

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
  const left = stringifyValue(leftValue ?? "");
  const right = stringifyValue(rightValue ?? "");

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
          : stringifyValue(va).localeCompare(stringifyValue(vb), "ko");
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
  return sorted;
}

function processTables(template, rows, labelMap) {
  return template.replace(/\{\{#table\s+(.+?)\}\}/g, (match, colList) => {
    const cols = colList.split(",").map((c) => c.trim());
    if (rows.length === 0) return "(데이터 없음)";

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
        return stringifyValue(getFieldValue(row, col, labelMap));
      });
      table += "| " + cells.join(" | ") + " |\n";
    });

    return table;
  });
}

function processEach(template, rows, labelMap) {
  return template.replace(/\{\{#each\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, inner) => {
    if (rows.length === 0) return "";
    return rows
      .map((row, idx) => replaceVariables(inner, row, labelMap, idx + 1))
      .join("");
  });
}

/**
 * {{#timetable date=날짜 period=시간표 week=YYYY-MM-DD days=월,화,수}}
 * 칸템플릿
 * {{/timetable}}
 */
function processTimetables(template, rows, fields, labelMap) {
  return template.replace(
    /\{\{#timetable\s+(.+?)\}\}([\s\S]*?)\{\{\/timetable\}\}/g,
    (_, attrStr, cellTemplate) => {
      const attrs = parseTimetableAttrs(attrStr);
      const { slots, error, periodOrder } = buildTimetableSlots(rows, fields, {
        dateLabel: attrs.dateLabel,
        periodLabel: attrs.periodLabel,
      });
      if (error) {
        return `_(시간표: ${error})_`;
      }
      if (slots.length === 0) {
        return "_(시간표: 표시할 데이터가 없습니다.)_";
      }

      const weeks = attrs.weekStart
        ? [attrs.weekStart]
        : [...new Set(slots.map((s) => s.weekStart).filter(Boolean))].sort();

      if (weeks.length === 0) {
        return "_(시간표: 유효한 날짜가 없습니다.)_";
      }

      return weeks
        .map((week) => {
          const { dayCols, grid } = buildWeekGrid(
            slots,
            periodOrder,
            week,
            attrs.dayIndexes
          );
          return renderTimetableMarkdown(
            week,
            dayCols,
            grid,
            cellTemplate.trim(),
            labelMap
          );
        })
        .join("\n\n");
    }
  );
}

function renderTimetableMarkdown(weekStart, dayCols, grid, cellTemplate, labelMap) {
  const dates = weekDates(weekStart);
  const end = dates[6] || weekStart;
  let md = `**주간 시간표** (${weekStart} ~ ${end})\n\n`;

  const headers = ["교시", ...dayCols.map((c) => `${c.label}${c.date ? ` ${c.date.slice(5)}` : ""}`)];
  md += "| " + headers.join(" | ") + " |\n";
  md += "| " + headers.map(() => "---").join(" | ") + " |\n";

  for (const row of grid) {
    const cells = row.cells.map((slotList) => {
      if (!slotList.length) return "";
      return slotList
        .map((slot) => {
          const rendered = replaceVariables(
            cellTemplate,
            slot.row,
            labelMap
          );
          // markdown table: escape pipes / collapse newlines
          return rendered
            .replace(/\|/g, "\\|")
            .replace(/\r?\n+/g, "<br>");
        })
        .join("<br>---<br>");
    });
    md +=
      "| " +
      [String(row.period).replace(/\|/g, "\\|"), ...cells].join(" | ") +
      " |\n";
  }

  return md;
}

function replaceVariables(template, row, labelMap, index) {
  return template.replace(/\{\{(.+?)\}\}/g, (match, varExpr) => {
    const parts = varExpr.split("|");
    const varName = parts[0].trim();

    if (varName.startsWith("#") || varName.startsWith("/")) return match;

    if (varName === "_index") {
      const val = index != null ? String(index) : "";
      return parts.length > 1 ? applyPipes(val, parts.slice(1)) : val;
    }

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
        : stringifyValue(value);
    }

    return match;
  });
}
