import {
  TAltForm,
  TAltFormField,
  TAssessmentData,
  TFormRubric,
} from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { normalizeApprovalValue } from "utils/approvalLine";
import { getFieldRubrics } from "./FieldRubricPanel";

export type TSummaryBarItem = {
  key: string;
  label: string;
  count: number;
};

export type TFieldAssessmentSummary = {
  method: "manual_score" | "rubric";
  scoreAverage?: number;
  scoreBars?: TSummaryBarItem[];
  rubricGroups?: { rubricId: string; rubricTitle: string; bars: TSummaryBarItem[] }[];
};

export type TFieldSummary = {
  fieldId: string;
  label: string;
  kind: "bars" | "list";
  answerCount: number;
  average?: number;
  bars?: TSummaryBarItem[];
  texts?: string[];
  assessment?: TFieldAssessmentSummary;
};

export type TQuizSummary = {
  answered: number;
  average: number;
  max?: number;
  bars: TSummaryBarItem[];
};

export type TAssessmentOverview = {
  finalized: number;
  draft: number;
  ungraded: number;
  averageScore?: number;
  averageMax?: number;
  scoreBars: TSummaryBarItem[];
};

export type TSheetSummaryResult = {
  totalRows: number;
  quiz?: TQuizSummary;
  assessment?: TAssessmentOverview;
  fields: TFieldSummary[];
};

const LIST_TYPES = new Set([
  "text",
  "textarea",
  "docResponse",
  "userSelect",
  "circulation",
  "link",
]);

const BAR_OPTION_TYPES = new Set([
  "radio",
  "select",
  "checkbox",
  "multiSelect",
  "scale",
  "rating",
]);

const BAR_VALUE_TYPES = new Set(["number", "counter", "date", "multiDate", "time"]);

const SKIP_TYPES = new Set(["file", "content", "aiChat"]);

const TEXT_LIST_LIMIT = 50;

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

const bump = (map: Map<string, { label: string; count: number }>, key: string, label: string) => {
  const prev = map.get(key);
  if (prev) prev.count += 1;
  else map.set(key, { label, count: 1 });
};

const mapToBars = (
  map: Map<string, { label: string; count: number }>,
  preferredOrder?: string[]
): TSummaryBarItem[] => {
  const items = Array.from(map.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    count: v.count,
  }));
  if (preferredOrder?.length) {
    const order = new Map(preferredOrder.map((k, i) => [k, i]));
    items.sort((a, b) => {
      const ai = order.has(a.key) ? (order.get(a.key) as number) : 9999;
      const bi = order.has(b.key) ? (order.get(b.key) as number) : 9999;
      if (ai !== bi) return ai - bi;
      return b.count - a.count;
    });
  } else {
    items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  }
  return items;
};

const formatDateLabel = (value: string): string => {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
};

const formatDisplayValue = (value: unknown, field: TAltFormField): string => {
  if (isEmptyValue(value)) return "";
  if (field.type === "userSelect" && typeof value === "object" && value) {
    const v = value as { userName?: string; userId?: string };
    return v.userName
      ? `${v.userName}${v.userId ? ` (${v.userId})` : ""}`
      : String((value as { user?: string }).user || "");
  }
  if (field.type === "circulation" && Array.isArray(value)) {
    return value
      .map((u) => {
        if (!u || typeof u !== "object") return "";
        const v = u as { userName?: string; userId?: string };
        return v.userName
          ? `${v.userName}${v.userId ? ` (${v.userId})` : ""}`
          : v.userId || "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (field.type === "link" && typeof value === "object" && value) {
    const v = value as { title?: string; ogTitle?: string; url?: string };
    return v.title || v.ogTitle || v.url || "";
  }
  if (field.type === "date" && typeof value === "string") {
    return formatDateLabel(value);
  }
  if (field.type === "multiDate" && Array.isArray(value)) {
    return value.map((v) => formatDateLabel(String(v))).join(", ");
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
};

const collectOptionTokens = (value: unknown): string[] => {
  if (isEmptyValue(value)) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [String(value)];
};

const buildFieldResponseSummary = (
  field: TAltFormField,
  rows: TAltSheetRow[]
): TFieldSummary | null => {
  if (SKIP_TYPES.has(field.type)) return null;

  if (field.type === "approval") {
    const map = new Map<string, { label: string; count: number }>();
    let answerCount = 0;
    const labels: Record<string, string> = {
      pending: "결재 진행 중",
      approved: "최종 승인",
      rejected: "반려",
    };
    for (const row of rows) {
      const raw = row.data?.[field._id];
      if (isEmptyValue(raw)) continue;
      const normalized = normalizeApprovalValue(raw, field);
      if (!normalized) continue;
      answerCount += 1;
      const status = normalized.overallStatus || "pending";
      bump(map, status, labels[status] || status);
    }
    return {
      fieldId: field._id,
      label: field.label || "결재선",
      kind: "bars",
      answerCount,
      bars: mapToBars(map, ["approved", "pending", "rejected"]),
    };
  }

  if (LIST_TYPES.has(field.type)) {
    const texts: string[] = [];
    let answerCount = 0;
    for (const row of rows) {
      const raw = row.data?.[field._id];
      if (isEmptyValue(raw)) continue;
      const label = formatDisplayValue(raw, field).trim();
      if (!label) continue;
      answerCount += 1;
      if (texts.length < TEXT_LIST_LIMIT) texts.push(label);
    }
    return {
      fieldId: field._id,
      label: field.label || "문항",
      kind: "list",
      answerCount,
      texts,
    };
  }

  if (BAR_OPTION_TYPES.has(field.type) || BAR_VALUE_TYPES.has(field.type)) {
    const map = new Map<string, { label: string; count: number }>();
    let answerCount = 0;
    let numericSum = 0;
    let numericN = 0;
    const preferred: string[] = [];

    if (field.type === "rating") {
      const max = field.validation?.max || field.options?.length || 5;
      for (let i = 1; i <= max; i += 1) preferred.push(String(i));
    } else if (field.type === "scale") {
      const min = field.validation?.min ?? 1;
      const max = field.validation?.max ?? 5;
      for (let i = min; i <= max; i += 1) preferred.push(String(i));
    } else if (field.options?.length) {
      preferred.push(...field.options);
    }

    for (const opt of preferred) {
      if (!map.has(opt)) map.set(opt, { label: opt, count: 0 });
    }

    for (const row of rows) {
      const raw = row.data?.[field._id];
      if (isEmptyValue(raw)) continue;

      if (field.type === "multiDate" && Array.isArray(raw)) {
        answerCount += 1;
        for (const v of raw) {
          const label = formatDateLabel(String(v));
          bump(map, label, label);
        }
        continue;
      }

      if (field.type === "checkbox" || field.type === "multiSelect") {
        const tokens = collectOptionTokens(raw);
        if (tokens.length === 0) continue;
        answerCount += 1;
        for (const token of tokens) bump(map, token, token);
        continue;
      }

      answerCount += 1;
      let key: string;
      let label: string;
      if (field.type === "date" && typeof raw === "string") {
        label = formatDateLabel(raw);
        key = label;
      } else if (field.type === "number" || field.type === "counter" || field.type === "rating" || field.type === "scale") {
        key = String(raw);
        label =
          field.type === "rating" || field.type === "scale"
            ? `${raw}`
            : String(raw);
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          numericSum += n;
          numericN += 1;
        }
      } else {
        key = String(raw);
        label = String(raw);
      }
      bump(map, key, label);
    }

    // Keep zero-count preferred options for rating/scale/select completeness
    const bars = mapToBars(map, preferred.length ? preferred : undefined).filter(
      (b) =>
        preferred.length === 0 ||
        b.count > 0 ||
        field.type === "rating" ||
        field.type === "scale" ||
        !!field.options?.includes(b.key)
    );

    return {
      fieldId: field._id,
      label: field.label || "문항",
      kind: "bars",
      answerCount,
      average: numericN > 0 ? numericSum / numericN : undefined,
      bars,
    };
  }

  // fallback list
  const texts: string[] = [];
  let answerCount = 0;
  for (const row of rows) {
    const raw = row.data?.[field._id];
    if (isEmptyValue(raw)) continue;
    const label = formatDisplayValue(raw, field).trim();
    if (!label) continue;
    answerCount += 1;
    if (texts.length < TEXT_LIST_LIMIT) texts.push(label);
  }
  return {
    fieldId: field._id,
    label: field.label || "문항",
    kind: "list",
    answerCount,
    texts,
  };
};

const getAssessment = (row: TAltSheetRow): TAssessmentData | null => {
  const raw = row.data?._assessment;
  if (!raw || typeof raw !== "object") return null;
  return raw as TAssessmentData;
};

const buildQuizSummary = (rows: TAltSheetRow[]): TQuizSummary | undefined => {
  const map = new Map<string, { label: string; count: number }>();
  let sum = 0;
  let n = 0;
  let max: number | undefined;
  for (const row of rows) {
    const score = row.data?._quiz_score;
    if (score === null || score === undefined || score === "") continue;
    const num = Number(score);
    if (Number.isNaN(num)) continue;
    n += 1;
    sum += num;
    const total = row.data?._quiz_total;
    if (total != null && !Number.isNaN(Number(total))) {
      max = Math.max(max ?? 0, Number(total));
    }
    const key = String(num);
    bump(map, key, `${num}점`);
  }
  if (n === 0) return undefined;
  return {
    answered: n,
    average: sum / n,
    max,
    bars: mapToBars(map),
  };
};

const buildAssessmentOverview = (
  rows: TAltSheetRow[]
): TAssessmentOverview | undefined => {
  let finalized = 0;
  let draft = 0;
  let ungraded = 0;
  let scoreSum = 0;
  let scoreN = 0;
  let maxSum = 0;
  let maxN = 0;
  const map = new Map<string, { label: string; count: number }>();

  for (const row of rows) {
    const assessment = getAssessment(row);
    const status = assessment?.final?.status;
    if (status === "finalized") {
      finalized += 1;
      const score = assessment?.final?.score;
      const max = assessment?.final?.max;
      if (score != null && !Number.isNaN(Number(score))) {
        scoreSum += Number(score);
        scoreN += 1;
        bump(map, String(score), `${score}점`);
      }
      if (max != null && !Number.isNaN(Number(max))) {
        maxSum += Number(max);
        maxN += 1;
      }
    } else if (status === "draft" || (assessment && Object.keys(assessment.byField || {}).length > 0)) {
      draft += 1;
    } else {
      ungraded += 1;
    }
  }

  if (finalized + draft + ungraded === 0) return undefined;

  return {
    finalized,
    draft,
    ungraded,
    averageScore: scoreN > 0 ? scoreSum / scoreN : undefined,
    averageMax: maxN > 0 ? maxSum / maxN : undefined,
    scoreBars: mapToBars(map),
  };
};

const buildFieldAssessmentSummary = (
  field: TAltFormField,
  form: TAltForm,
  rows: TAltSheetRow[]
): TFieldAssessmentSummary | undefined => {
  const method = field.gradingMethod;
  if (!method || method === "none" || method === "completion") return undefined;

  const finalizedRows = rows.filter(
    (row) => getAssessment(row)?.final?.status === "finalized"
  );
  if (finalizedRows.length === 0) {
    return method === "rubric"
      ? { method: "rubric", rubricGroups: [] }
      : { method: "manual_score", scoreBars: [] };
  }

  if (method === "manual_score") {
    const map = new Map<string, { label: string; count: number }>();
    let sum = 0;
    let n = 0;
    for (const row of finalizedRows) {
      const grade = getAssessment(row)?.byField?.[field._id];
      if (grade?.score == null || Number.isNaN(Number(grade.score))) continue;
      const score = Number(grade.score);
      n += 1;
      sum += score;
      bump(map, String(score), `${score}점`);
    }
    return {
      method: "manual_score",
      scoreAverage: n > 0 ? sum / n : undefined,
      scoreBars: mapToBars(map),
    };
  }

  if (method === "rubric") {
    const rubrics = getFieldRubrics(field, form.rubrics);
    const rubricGroups = rubrics.map((rubric: TFormRubric) => {
      const map = new Map<string, { label: string; count: number }>();
      for (const level of rubric.levels || []) {
        map.set(level.id, { label: level.label, count: 0 });
      }
      for (const row of finalizedRows) {
        const grade = getAssessment(row)?.byField?.[field._id];
        const byRubric = grade?.byRubric?.[rubric.id];
        const levelId = byRubric?.levelId || grade?.levelId;
        const levelLabel =
          byRubric?.levelLabel ||
          grade?.levelLabel ||
          (rubric.levels || []).find((l) => l.id === levelId)?.label;
        if (!levelId && !levelLabel) continue;
        const key = levelId || levelLabel || "unknown";
        const label = levelLabel || levelId || "미선택";
        bump(map, key, label);
      }
      return {
        rubricId: rubric.id,
        rubricTitle: rubric.title || "루브릭",
        bars: mapToBars(
          map,
          (rubric.levels || []).map((l) => l.id)
        ),
      };
    });
    return { method: "rubric", rubricGroups };
  }

  return undefined;
};

/**
 * 필터된 시트 행으로 구글 설문지형 요약 집계를 만든다.
 * 평가 수치는 확정(finalized) 행만 반영한다.
 */
export function buildSheetSummary(params: {
  form: TAltForm;
  rows: TAltSheetRow[];
  fields: TAltFormField[];
  includeAssessment: boolean;
}): TSheetSummaryResult {
  const { form, rows, fields, includeAssessment } = params;
  const fieldSummaries: TFieldSummary[] = [];

  for (const field of fields) {
    if (field.type === "content") continue;
    const base = buildFieldResponseSummary(field, rows);
    if (!base) continue;
    if (includeAssessment && form.settings?.assessmentMode) {
      const assessment = buildFieldAssessmentSummary(field, form, rows);
      if (assessment) base.assessment = assessment;
    }
    fieldSummaries.push(base);
  }

  return {
    totalRows: rows.length,
    quiz:
      includeAssessment && form.settings?.quizMode
        ? buildQuizSummary(rows)
        : undefined,
    assessment:
      includeAssessment && form.settings?.assessmentMode
        ? buildAssessmentOverview(rows)
        : undefined,
    fields: fieldSummaries,
  };
}
