import { FIELD_TYPE_LABELS } from "pages/boards/altBoard/formFieldLabel";
import { TAltFormFieldType } from "types/altForm";
import { TAlterSearchDraftResult } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INTERACTIVE_FENCE_RE = /```(?:html-app|canvas)(?::\d+)?\b/;

const DOC_HTML_RE =
  /<(table|thead|tbody|tfoot|tr|td|th|colgroup|col)\b/i;

const STYLED_BLOCK_RE =
  /<(div|section|article|p|h[1-6]|ul|ol|li|span)\b[^>]*(?:style|class)\s*=/i;

export const RICH_TEXT_MIN = 240;

export const looksLikeUuid = (value: string) =>
  UUID_RE.test(String(value || "").trim());

export const hasInteractiveFence = (text: string) =>
  INTERACTIVE_FENCE_RE.test(String(text || ""));

export const looksLikeDocumentHtml = (text: string) => {
  const t = String(text || "");
  if (!t.includes("<")) return false;
  if (DOC_HTML_RE.test(t)) return true;
  if (STYLED_BLOCK_RE.test(t)) return true;
  const blocks = t.match(/<(div|p|h[1-6]|ul|ol|li|br)\b/gi);
  return (blocks?.length || 0) >= 3;
};

export const looksLikeRichDraftText = (text: string) => {
  const t = String(text || "");
  if (!t.trim()) return false;
  if (looksLikeDocumentHtml(t)) return true;
  if (/^#{1,6}\s+\S/m.test(t)) return true;
  if (/^\|.+\|/m.test(t)) return true;
  return t.length > RICH_TEXT_MIN;
};

export const firstHeadingFromContent = (text: string) => {
  const t = String(text || "").trim();
  if (!t) return "";
  const md = t.match(/^#{1,6}\s+(.+)$/m);
  if (md?.[1]) return md[1].replace(/<[^>]+>/g, "").trim();
  const html = t.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  if (html?.[1]) return html[1].replace(/<[^>]+>/g, "").trim();
  return "";
};

export const fieldTypeLabel = (type?: string) => {
  if (!type) return "";
  return FIELD_TYPE_LABELS[type as TAltFormFieldType] || "";
};

export const previewFieldLabel = (
  fieldId: string,
  value: unknown,
  field?: { label?: string; type?: string } | null
) => {
  const raw = String(field?.label || "").trim();
  if (raw && !looksLikeUuid(raw)) return raw;
  const heading =
    typeof value === "string" ? firstHeadingFromContent(value) : "";
  if (heading) return heading;
  if (typeof value === "string" && !looksLikeDocumentHtml(value)) {
    const line = value.replace(/<[^>]+>/g, "").trim().split("\n")[0] || "";
    if (line.length > 1 && line.length < 80 && !looksLikeUuid(line)) {
      return line;
    }
  }
  const typed = fieldTypeLabel(field?.type);
  if (typed) return typed;
  if (raw) return raw;
  return looksLikeUuid(fieldId) ? "필드" : fieldId;
};

export const formParserType = (
  formType?: string
): "timetable" | "syllabus" =>
  formType === "timetable" ? "timetable" : "syllabus";

export const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const buildCsv = (
  columns: Array<{ key: string }>,
  rows: Array<Record<string, unknown>>
) => {
  const header = columns.map((c) => csvEscape(c.key)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
};

export const buildSearchCsv = (draft: TAlterSearchDraftResult) => {
  const cols =
    draft.columns?.length > 0
      ? draft.columns
      : Object.keys(draft.rows?.[0] || {}).map((key) => ({ key }));
  return buildCsv(cols, draft.rows || []);
};

export const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const stringifyDraftValue = (val: unknown) => {
  if (typeof val === "string") return val;
  if (val == null) return "";
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
};
