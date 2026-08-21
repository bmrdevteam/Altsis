/**
 * 관리자 양식(Form) Alter 스킬 — 파서·정규화·데이터 카탈로그
 */

export const FORM_DRAFT_TYPE_LABELS = {
  timetable: "시간표",
  syllabus: "강의계획서",
  print: "출력",
};

export const FORM_DRAFT_FORM_TYPES = new Set(["timetable", "syllabus", "print"]);

export const FORM_DRAFT_BLOCK_TYPES = new Set([
  "paragraph",
  "table",
  "divider",
]);

export const FORM_DRAFT_CELL_TYPES = new Set([
  "paragraph",
  "data",
  "time",
  "timeRange",
  "checkbox",
  "input",
  "select",
]);

export const FORM_DRAFT_OPS = new Set([
  "updateCell",
  "setDataText",
  "updateBlockData",
  "addRow",
  "addColumn",
  "addBlock",
  "removeBlock",
]);

export const FORM_DRAFT_FILTER_OPS = new Set([
  "===",
  "!==",
  "empty",
  "notEmpty",
]);

export const FORM_DRAFT_MAX_ROWS = 24;
export const FORM_DRAFT_MAX_COLS = 10;
export const FORM_DRAFT_MAX_BLOCKS = 20;
export const FORM_DRAFT_MAX_OPS = 80;
export const FORM_DRAFT_TEXT_CHARS = 2000;
export const FORM_DRAFT_TITLE_CHARS = 120;

const FONT_WEIGHTS = new Set([400, 500, 600, 700]);
const ALIGN_VALUES = new Set(["left", "center", "right"]);
const BORDER_STYLES = new Set(["solid", "none", "dashed", "dotted"]);
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_COLOR_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i;

const newId = (prefix = "b") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const resolveFormDraftType = (raw) => {
  const t = String(raw || "").trim();
  return FORM_DRAFT_FORM_TYPES.has(t) ? t : "timetable";
};

const clip = (value, max) => {
  const s = String(value ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max);
};

const looksUnsafeCss = (value) =>
  /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|<|>/i.test(
    String(value || "")
  );

const normalizeColor = (raw) => {
  const s = String(raw ?? "").trim();
  if (!s || looksUnsafeCss(s)) return undefined;
  if (HEX_COLOR_RE.test(s)) return s.toLowerCase();
  const m = s.match(RGB_COLOR_RE);
  if (!m) return undefined;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if ([r, g, b].some((n) => n > 255)) return undefined;
  if (m[4] != null) {
    const a = Number(m[4]);
    if (!Number.isFinite(a) || a < 0 || a > 1) return undefined;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
};

const normalizeFontSize = (raw) => {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{1,2})px$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n < 10 || n > 36) return undefined;
  return `${n}px`;
};

/** 에디터가 쓰는 셀 스타일만 통과. url()/임의 CSS는 버린다. */
const assignCellStyle = (target, raw, { allowUnsetHeader = false } = {}) => {
  if (!raw || typeof raw !== "object" || !target) return target;
  const bg = normalizeColor(raw.backgroundColor);
  if (bg) target.backgroundColor = bg;
  const fs = normalizeFontSize(raw.fontSize);
  if (fs) target.fontSize = fs;
  const fw = Number(raw.fontWeight);
  if (FONT_WEIGHTS.has(fw)) target.fontWeight = fw;
  const alignRaw = raw.align || raw.textAlign;
  if (ALIGN_VALUES.has(alignRaw)) {
    target.align = alignRaw;
    target.textAlign = alignRaw;
  }
  if (raw.isHeader === true) target.isHeader = true;
  else if (allowUnsetHeader && raw.isHeader === false) target.isHeader = false;
  if (raw.borderWidth != null) {
    const bw = Number(raw.borderWidth);
    if (Number.isFinite(bw) && bw >= 0 && bw <= 8) {
      target.borderWidth = Math.floor(bw);
    }
  }
  const bc = normalizeColor(raw.borderColor);
  if (bc) target.borderColor = bc;
  const bs = String(raw.borderStyle || "").trim();
  if (BORDER_STYLES.has(bs)) target.borderStyle = bs;
  return target;
};

const unwrapOuterMarkdownFence = (text) => {
  const t = String(text || "").trim();
  const m = t.match(/^```(?:json|markdown|md)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  return m ? m[1].trim() : t;
};

export const parseFormDraftResponse = (text) => {
  let raw = unwrapOuterMarkdownFence(text);
  if (!raw) return null;

  const marker = raw.match(/<<<JSON>>>\s*([\s\S]*?)\s*(?:<<<END>>>|$)/i);
  if (marker) raw = marker[1].trim();
  else {
    const fence = raw.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```/i);
    if (fence) raw = fence[1].trim();
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};

const compactCell = (cell) => {
  if (!cell || typeof cell !== "object") return null;
  const type = FORM_DRAFT_CELL_TYPES.has(cell.type)
    ? cell.type
    : "paragraph";
  const out = {
    id: String(cell.id || ""),
    type,
  };
  if (cell.name) out.name = String(cell.name);
  const text = cell.data?.text ?? cell.text;
  if (text != null && String(text)) {
    out.text = clip(text, FORM_DRAFT_TEXT_CHARS);
  }
  if (Array.isArray(cell.dataText) && cell.dataText.length) {
    out.dataText = cell.dataText;
  }
  if (cell.timeRangeStart) out.timeRangeStart = String(cell.timeRangeStart);
  if (cell.timeRangeEnd) out.timeRangeEnd = String(cell.timeRangeEnd);
  if (cell.timeRangeDisplayText) {
    out.timeRangeDisplayText = String(cell.timeRangeDisplayText);
  }
  if (cell.required) out.required = true;
  if (Array.isArray(cell.options) && cell.options.length) {
    out.options = cell.options;
  }
  if (cell.placeholder) out.placeholder = String(cell.placeholder);
  assignCellStyle(out, cell);
  return out;
};

export const compactFormSnapshot = (blocks) => {
  if (!Array.isArray(blocks)) return [];
  return blocks.slice(0, FORM_DRAFT_MAX_BLOCKS).map((block) => {
    const type = String(block?.type || "paragraph");
    const data = block?.data || {};
    const compact = { id: String(block?.id || ""), type };
    if (type === "paragraph") {
      compact.text = clip(data.text || "", FORM_DRAFT_TEXT_CHARS);
      return compact;
    }
    if (type === "divider") return compact;
    if (type === "image") {
      compact.type = "image";
      compact.kept = true;
      return compact;
    }
    if (type === "table") {
      const table = Array.isArray(data.table) ? data.table : [];
      compact.rows = table.length;
      compact.cols = table[0]?.length || 0;
      compact.table = table.map((row) =>
        (Array.isArray(row) ? row : []).map((cell) => compactCell(cell))
      );
      if (data.dataRepeat) compact.dataRepeat = data.dataRepeat;
      if (Array.isArray(data.dataFilter) && data.dataFilter.length) {
        compact.dataFilter = data.dataFilter;
      }
      if (Array.isArray(data.dataOrFilter) && data.dataOrFilter.length) {
        compact.dataOrFilter = data.dataOrFilter;
      }
      if (Array.isArray(data.dataCellFilter) && data.dataCellFilter.length) {
        compact.dataCellFilter = data.dataCellFilter;
      }
      if (Array.isArray(data.dataOrder) && data.dataOrder.length) {
        compact.dataOrder = data.dataOrder;
      }
    }
    return compact;
  });
};

const collectInputIds = (blocks) => {
  const ids = new Set();
  for (const block of Array.isArray(blocks) ? blocks : []) {
    const table = block?.data?.table;
    if (!Array.isArray(table)) continue;
    for (const row of table) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        if (cell?.type === "input" && cell.id) ids.add(String(cell.id));
      }
    }
  }
  return ids;
};

const normalizeSelectOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 30)
    .map((opt, i) => {
      if (opt && typeof opt === "object") {
        const text = clip(opt.text || opt.value || opt.label || "", 40);
        const value = clip(opt.value || opt.text || opt.id || text, 40);
        if (!text && !value) return null;
        return {
          id: String(opt.id || `opt_${i}`),
          text: text || value,
          value: value || text,
        };
      }
      const s = clip(opt, 40);
      if (!s) return null;
      return { id: `opt_${i}`, text: s, value: s };
    })
    .filter(Boolean);
};

const normalizeDataText = (raw, allowedLocations) => {
  if (!Array.isArray(raw)) return undefined;
  const allow =
    allowedLocations instanceof Set
      ? allowedLocations
      : new Set(Array.isArray(allowedLocations) ? allowedLocations : []);
  const out = [];
  for (const item of raw.slice(0, 40)) {
    if (typeof item === "string") {
      const t = clip(item, FORM_DRAFT_TEXT_CHARS);
      if (t) out.push(t);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    if (item.tag === "BR") {
      out.push({ tag: "BR" });
      continue;
    }
    if (item.tag === "DATA") {
      const location = String(item.location || "").trim();
      if (!location) continue;
      if (allow.size > 0 && !allow.has(location)) continue;
      out.push({ tag: "DATA", location });
    }
  }
  return out.length ? out : undefined;
};

const normalizeFilterList = (raw) => {
  if (!Array.isArray(raw)) return undefined;
  const out = [];
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const operator = FORM_DRAFT_FILTER_OPS.has(item.operator)
      ? item.operator
      : "===";
    const row = {
      key: String(item.key || newId("flt")),
      by: clip(item.by || "", 120),
      operator,
      value: clip(item.value || "", 80),
    };
    if (item.cell) row.cell = clip(item.cell, 80);
    if (!row.by) continue;
    out.push(row);
  }
  return out.length ? out : undefined;
};

const normalizeOrderList = (raw) => {
  if (!Array.isArray(raw)) return undefined;
  const out = [];
  for (const item of raw.slice(0, 10)) {
    if (!item || typeof item !== "object") continue;
    const by = clip(item.by || "", 120);
    if (!by) continue;
    out.push({
      key: String(item.key || newId("ord")),
      by,
      priority: clip(item.priority || "", 20),
      order: item.order === "desc" ? "desc" : "asc",
    });
  }
  return out.length ? out : undefined;
};

const normalizeDataRepeat = (raw, allowedRepeatBy) => {
  if (!raw || typeof raw !== "object") return undefined;
  const by = String(raw.by || "").trim();
  if (!by) return undefined;
  const allow =
    allowedRepeatBy instanceof Set
      ? allowedRepeatBy
      : new Set(Array.isArray(allowedRepeatBy) ? allowedRepeatBy : []);
  if (allow.size > 0 && !allow.has(by)) return undefined;
  const index = Number(raw.index);
  const max = Number(raw.max);
  return {
    by,
    index: Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0,
    max:
      Number.isFinite(max) && max > 0
        ? Math.min(100, Math.floor(max))
        : "",
  };
};

const normalizeCell = (raw, ctx) => {
  const type = FORM_DRAFT_CELL_TYPES.has(raw?.type) ? raw.type : "paragraph";
  const id = String(raw?.id || "").trim() || newId("c");
  const cell = {
    id,
    type,
    data: { text: clip(raw?.data?.text ?? raw?.text ?? "", FORM_DRAFT_TEXT_CHARS) },
  };
  if (raw?.name) cell.name = clip(raw.name, 80);
  assignCellStyle(cell, raw);
  if (raw?.required) cell.required = true;
  if (raw?.placeholder) cell.placeholder = clip(raw.placeholder, 80);
  if (type === "timeRange" || type === "checkbox") {
    if (raw?.timeRangeStart) cell.timeRangeStart = clip(raw.timeRangeStart, 8);
    if (raw?.timeRangeEnd) cell.timeRangeEnd = clip(raw.timeRangeEnd, 8);
  }
  if (type === "timeRange" && raw?.timeRangeDisplayText) {
    cell.timeRangeDisplayText = clip(raw.timeRangeDisplayText, 40);
  }
  if (type === "select") {
    cell.options = normalizeSelectOptions(raw?.options);
  }
  if (type === "data") {
    const dataText = normalizeDataText(raw?.dataText, ctx.allowedLocations);
    if (dataText) cell.dataText = dataText;
  }
  if (ctx.formType === "syllabus" && ctx.existingInputIds?.has(id) === false) {
    // new input ids are allowed on create; refine is handled in ops
  }
  return cell;
};

const normalizeTableData = (raw, ctx) => {
  const tableRaw = Array.isArray(raw?.table) ? raw.table : [];
  const rowCount = Math.min(
    FORM_DRAFT_MAX_ROWS,
    Math.max(1, tableRaw.length || 1)
  );
  const colCount = Math.min(
    FORM_DRAFT_MAX_COLS,
    Math.max(
      1,
      tableRaw.reduce(
        (max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
        Array.isArray(raw?.columns) ? raw.columns.length : 0
      ) || 1
    )
  );
  const table = [];
  for (let r = 0; r < rowCount; r += 1) {
    const srcRow = Array.isArray(tableRaw[r]) ? tableRaw[r] : [];
    const row = [];
    for (let c = 0; c < colCount; c += 1) {
      row.push(normalizeCell(srcRow[c] || {}, ctx));
    }
    table.push(row);
  }
  const columns = Array.isArray(raw?.columns)
    ? raw.columns
        .slice(0, colCount)
        .map((n) => {
          const v = Number(n);
          return Number.isFinite(v) && v > 0 ? v : 1;
        })
    : [];
  while (columns.length < colCount) columns.push(1);
  const data = { columns, table };
  const dataRepeat = normalizeDataRepeat(raw?.dataRepeat, ctx.allowedRepeatBy);
  if (dataRepeat) data.dataRepeat = dataRepeat;
  const dataFilter = normalizeFilterList(raw?.dataFilter);
  if (dataFilter) data.dataFilter = dataFilter;
  const dataOrFilter = normalizeFilterList(raw?.dataOrFilter);
  if (dataOrFilter) data.dataOrFilter = dataOrFilter;
  const dataCellFilter = normalizeFilterList(raw?.dataCellFilter);
  if (dataCellFilter) data.dataCellFilter = dataCellFilter;
  const dataOrder = normalizeOrderList(raw?.dataOrder);
  if (dataOrder) data.dataOrder = dataOrder;
  return data;
};

const normalizeBlock = (raw, ctx) => {
  const type = FORM_DRAFT_BLOCK_TYPES.has(raw?.type) ? raw.type : null;
  if (!type) return null;
  const id = String(raw?.id || "").trim() || newId("b");
  if (type === "paragraph") {
    return {
      id,
      type,
      data: { text: clip(raw?.data?.text ?? raw?.text ?? "", FORM_DRAFT_TEXT_CHARS) },
    };
  }
  if (type === "divider") {
    return { id, type, data: {} };
  }
  return { id, type: "table", data: normalizeTableData(raw?.data || raw, ctx) };
};

const findBlock = (blocks, blockId) =>
  (Array.isArray(blocks) ? blocks : []).find(
    (b) => String(b?.id) === String(blockId)
  );

const normalizeCellPatch = (raw, ctx, existingCell) => {
  if (!raw || typeof raw !== "object") return null;
  const patch = {};
  if (FORM_DRAFT_CELL_TYPES.has(raw.type)) patch.type = raw.type;
  if (raw.name != null) patch.name = clip(raw.name, 80);
  if (raw.required != null) patch.required = !!raw.required;
  if (raw.placeholder != null) patch.placeholder = clip(raw.placeholder, 80);
  assignCellStyle(patch, raw, { allowUnsetHeader: true });
  if (raw.timeRangeStart != null) {
    patch.timeRangeStart = clip(raw.timeRangeStart, 8);
  }
  if (raw.timeRangeEnd != null) patch.timeRangeEnd = clip(raw.timeRangeEnd, 8);
  if (raw.timeRangeDisplayText != null) {
    patch.timeRangeDisplayText = clip(raw.timeRangeDisplayText, 40);
  }
  if (raw.options != null) patch.options = normalizeSelectOptions(raw.options);
  if (raw.dataText != null) {
    const dataText = normalizeDataText(raw.dataText, ctx.allowedLocations);
    if (dataText) patch.dataText = dataText;
  }
  if (raw.data != null || raw.text != null) {
    const text = clip(raw.data?.text ?? raw.text ?? "", FORM_DRAFT_TEXT_CHARS);
    patch.data = { ...(existingCell?.data || {}), text };
  }
  if (ctx.formType === "syllabus" && existingCell?.type === "input") {
    delete patch.id;
  }
  return Object.keys(patch).length ? patch : null;
};

const normalizeBlockDataPatch = (raw, ctx) => {
  if (!raw || typeof raw !== "object") return null;
  const patch = {};
  if (raw.text != null) patch.text = clip(raw.text, FORM_DRAFT_TEXT_CHARS);
  const dataRepeat = normalizeDataRepeat(raw.dataRepeat, ctx.allowedRepeatBy);
  if (dataRepeat) patch.dataRepeat = dataRepeat;
  const dataFilter = normalizeFilterList(raw.dataFilter);
  if (dataFilter) patch.dataFilter = dataFilter;
  const dataOrFilter = normalizeFilterList(raw.dataOrFilter);
  if (dataOrFilter) patch.dataOrFilter = dataOrFilter;
  const dataCellFilter = normalizeFilterList(raw.dataCellFilter);
  if (dataCellFilter) patch.dataCellFilter = dataCellFilter;
  const dataOrder = normalizeOrderList(raw.dataOrder);
  if (dataOrder) patch.dataOrder = dataOrder;
  if (Array.isArray(raw.columns)) {
    patch.columns = raw.columns.slice(0, FORM_DRAFT_MAX_COLS).map((n) => {
      const v = Number(n);
      return Number.isFinite(v) && v > 0 ? v : 1;
    });
  }
  return Object.keys(patch).length ? patch : null;
};

export const normalizeFormDraftOps = (rawOps, ctx) => {
  const currentBlocks = Array.isArray(ctx.currentBlocks) ? ctx.currentBlocks : [];
  const ops = [];
  for (const raw of (Array.isArray(rawOps) ? rawOps : []).slice(
    0,
    FORM_DRAFT_MAX_OPS
  )) {
    const op = String(raw?.op || "").trim();
    if (!FORM_DRAFT_OPS.has(op)) continue;
    if (op === "addBlock") {
      const block = normalizeBlock(raw.block || raw, ctx);
      if (!block) continue;
      const afterId = raw.afterId ? String(raw.afterId) : "";
      ops.push({ op, ...(afterId ? { afterId } : {}), block });
      continue;
    }
    const blockId = String(raw?.blockId || "").trim();
    if (!blockId) continue;
    const block = findBlock(currentBlocks, blockId);
    if (!block) continue;

    if (op === "removeBlock") {
      if (block.type === "image") continue;
      ops.push({ op, blockId });
      continue;
    }
    if (op === "addRow" || op === "addColumn") {
      if (block.type !== "table") continue;
      const after = Number(raw.afterRow ?? raw.afterCol ?? raw.after ?? -1);
      ops.push({
        op,
        blockId,
        after: Number.isFinite(after) ? Math.floor(after) : -1,
      });
      continue;
    }
    if (op === "updateBlockData") {
      const patch = normalizeBlockDataPatch(raw.patch || raw.data || raw, ctx);
      if (!patch) continue;
      ops.push({ op, blockId, patch });
      continue;
    }
    if (op === "updateCell" || op === "setDataText") {
      if (block.type !== "table") continue;
      const row = Number(raw.row);
      const col = Number(raw.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
      const cell = block.data?.table?.[row]?.[col];
      if (!cell) continue;
      if (op === "setDataText") {
        const dataText = normalizeDataText(
          raw.dataText || raw.patch?.dataText,
          ctx.allowedLocations
        );
        if (!dataText) continue;
        ops.push({ op, blockId, row, col, dataText });
        continue;
      }
      const patch = normalizeCellPatch(raw.patch || raw, ctx, cell);
      if (!patch) continue;
      ops.push({ op, blockId, row, col, patch });
    }
  }
  return ops;
};

export const normalizeFormDraft = (parsed, options = {}) => {
  const formType = resolveFormDraftType(options.formType || parsed?.formType);
  const requestedMode =
    options.writeMode === "refine" || parsed?.writeMode === "refine"
      ? "refine"
      : "create";
  const ctx = {
    formType,
    allowedLocations: options.allowedLocations || new Set(),
    allowedRepeatBy: options.allowedRepeatBy || new Set(),
    existingInputIds: collectInputIds(options.currentBlocks),
    currentBlocks: options.currentBlocks || [],
  };

  const hasOps = Array.isArray(parsed?.ops) && parsed.ops.length > 0;
  if (requestedMode === "refine" && hasOps) {
    const ops = normalizeFormDraftOps(parsed.ops, ctx);
    return {
      writeMode: "refine",
      formType,
      title: clip(parsed?.title || options.currentTitle || "", FORM_DRAFT_TITLE_CHARS),
      ops,
    };
  }

  const rawBlocks = Array.isArray(parsed?.blocks)
    ? parsed.blocks
    : Array.isArray(parsed?.data)
      ? parsed.data
      : [];
  const blocks = rawBlocks
    .slice(0, FORM_DRAFT_MAX_BLOCKS)
    .map((b) => normalizeBlock(b, ctx))
    .filter(Boolean);
  return {
    writeMode: "create",
    formType,
    title: clip(
      parsed?.title || options.currentTitle || FORM_DRAFT_TYPE_LABELS[formType],
      FORM_DRAFT_TITLE_CHARS
    ),
    blocks,
  };
};

const evaluationLocationsForSchool = (schoolId, seasons) => {
  const locations = [
    `${schoolId}//evaluation//학년도`,
    `${schoolId}//evaluation//학년`,
  ];
  const subjectLabels = new Set();
  const yearFields = new Set();
  const termFields = new Map();
  for (const season of Array.isArray(seasons) ? seasons : []) {
    for (const lb of season?.subjects?.label || []) {
      if (lb) subjectLabels.add(String(lb));
    }
    const term = String(season?.term || "").trim();
    if (term && !termFields.has(term)) termFields.set(term, new Set());
    for (const ev of season?.formEvaluation || []) {
      const label = String(ev?.label || "").trim();
      if (!label) continue;
      if (ev.combineBy === "year") yearFields.add(label);
      else if (term) termFields.get(term).add(label);
    }
  }
  for (const lb of subjectLabels) {
    locations.push(`${schoolId}//evaluation//${lb}`);
  }
  for (const label of yearFields) {
    locations.push(`${schoolId}//evaluation//연도별/${label}`);
  }
  const terms = [...termFields.keys()].sort();
  for (const term of terms) {
    locations.push(`${schoolId}//evaluation//${term}/단위수`);
    for (const label of termFields.get(term) || []) {
      locations.push(`${schoolId}//evaluation//${term}/${label}`);
    }
  }
  return { locations, terms };
};

export const buildFormDraftDataCatalog = (school, seasons = []) => {
  const schoolId = String(school?.schoolId || "").trim();
  const schoolName = String(school?.schoolName || schoolId || "학교").trim();
  const locations = [];
  const repeatBy = [];
  if (schoolId) {
    for (const archive of school?.formArchive || []) {
      const label = String(archive?.label || "").trim();
      if (!label) continue;
      const by = `${schoolId}//archive//${label}`;
      repeatBy.push({ by, label: `${schoolName}-${label}` });
      for (const field of archive?.fields || []) {
        const fieldLabel = String(field?.label || "").trim();
        if (!fieldLabel) continue;
        locations.push(`${schoolId}//archive//${label}//${fieldLabel}`);
        if (field.runningTotal) {
          locations.push(
            `${schoolId}//archive//${label}//${fieldLabel}[누계합산]`
          );
        }
        if (field.total) {
          locations.push(`${schoolId}//archive//${label}//${fieldLabel}[합산]`);
        }
      }
    }
    repeatBy.push({
      by: `${schoolId}//evaluation`,
      label: `${schoolName}-평가`,
    });
    const ev = evaluationLocationsForSchool(schoolId, seasons);
    locations.push(...ev.locations);
  }

  const locationSet = new Set(locations);
  const repeatSet = new Set(repeatBy.map((r) => r.by));
  const lines = [];
  if (repeatBy.length) {
    lines.push("반복(dataRepeat.by):");
    for (const r of repeatBy) lines.push(`- ${r.by} (${r.label})`);
  }
  if (locations.length) {
    lines.push("데이터 location (data 셀 dataText):");
    for (const loc of locations.slice(0, 120)) lines.push(`- ${loc}`);
    if (locations.length > 120) {
      lines.push(`…외 ${locations.length - 120}개`);
    }
  }
  return {
    schoolId,
    schoolName,
    locations,
    repeatBy,
    allowedLocations: locationSet,
    allowedRepeatBy: repeatSet,
    catalogText: lines.join("\n") || "(연결 가능한 내부 데이터 없음)",
  };
};

export const formDraftTypeRules = (formType) => {
  const styleHint = `셀 스타일(화이트리스트): backgroundColor(#hex/rgb), fontSize(10-36px), fontWeight(400|500|600|700), align, isHeader, borderWidth/Color/Style.
헤더·라벨 칸은 배경·굵기로 구분해 문서처럼 보이게 하세요.`;
  if (formType === "syllabus") {
    return `강의계획서 규칙:
- 교사가 채울 칸은 type=input. id가 수업 데이터 키이므로 기존 input id를 바꾸지 마세요.
- name은 화면 라벨, required는 필수 여부.
- 제목·안내 문구는 paragraph 셀. 선택형은 select.
- 개설배경·학습내용·주차별·평가계획은 한 칸 한 줄이 아니라 문장 단위로 충분히 쓰세요.
- ${styleHint}`;
  }
  if (formType === "print") {
    return `출력 양식 규칙:
- 학생·학기 값은 data 셀의 dataText에 { "tag": "DATA", "location": "카탈로그 경로" } 만 쓰세요.
- 카탈로그에 없는 location은 쓰지 마세요.
- 학생/평가 반복 표는 dataRepeat.by를 카탈로그 반복 값으로 지정하세요.
- 라벨은 paragraph, 값은 data. 헤더 행은 음영.
- 이미지 블록은 만들지 마세요.
- ${styleHint}`;
  }
  return `시간표 규칙:
- 행은 시각·교시, 열은 요일(월~금 또는 월~일). 요일×교시 격자를 채우세요.
- 시각 칸: type=time 또는 timeRange(timeRangeStart/End, timeRangeDisplayText=교시명).
- 선택 가능한 수업 칸: type=checkbox, name은 저장 키(예: 월1, 화2).
- 고정 안내 문구는 paragraph로 짧게.
- 요일·교시 헤더는 배경·굵기.
- ${styleHint}`;
};
