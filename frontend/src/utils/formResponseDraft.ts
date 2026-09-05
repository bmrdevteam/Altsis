import { TAltFormFieldType } from "types/altForm";
import { normalizeDocumentDraftContent } from "utils/documentDraftMarkdown";
import {
  isAcceptableMergedDocResponse,
  isBrokenDocResponseImageDump,
} from "utils/formResponseSlots";

export type TFormResponseUserCandidate = {
  user: string;
  userId: string;
  userName: string;
};

export type TFormResponseFieldMeta = {
  fieldId: string;
  label: string;
  type: TAltFormFieldType | string;
  options?: string[];
  validation?: { min?: number; max?: number };
  template?: string;
};

/** AI가 값을 채울 수 있는 respondent 필드 (file·content 제외) */
export const FORM_RESPONSE_WRITABLE_TYPES = new Set([
  "text",
  "textarea",
  "docResponse",
  "number",
  "date",
  "multiDate",
  "time",
  "select",
  "multiSelect",
  "checkbox",
  "radio",
  "userSelect",
  "rating",
  "scale",
  "counter",
  "approval",
  "circulation",
  "link",
]);

export const isFormResponseWritableType = (type: string) =>
  FORM_RESPONSE_WRITABLE_TYPES.has(type);

const isEmptyValue = (value: unknown) => {
  if (value == null) return true;
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("url" in o) return !String(o.url || "").trim();
    if (Array.isArray(o.steps)) return o.steps.length === 0;
    return Object.keys(o).length === 0;
  }
  return false;
};

const findCandidate = (
  candidates: TFormResponseUserCandidate[],
  raw: unknown
): TFormResponseUserCandidate | null => {
  if (!raw || typeof raw !== "object") {
    const id = String(raw || "").trim();
    if (!id) return null;
    return (
      candidates.find((c) => c.userId === id || c.user === id) || null
    );
  }
  const o = raw as Record<string, unknown>;
  const userId = String(o.userId || "").trim();
  const user = String(o.user || "").trim();
  return (
    candidates.find(
      (c) =>
        (userId && c.userId === userId) ||
        (user && c.user === user) ||
        (userId && c.user === userId)
    ) || null
  );
};

/**
 * AI 초안 값을 필드 타입에 맞게 변환. 유효하지 않으면 null.
 */
export const coerceFormResponseValue = (
  field: TFormResponseFieldMeta,
  raw: unknown,
  userCandidates: TFormResponseUserCandidate[] = []
): unknown | null => {
  const type = String(field.type || "");
  if (!isFormResponseWritableType(type)) return null;

  if (type === "text" || type === "textarea" || type === "date" || type === "time") {
    const s = String(raw ?? "").trim();
    return s || null;
  }

  if (type === "docResponse") {
    const s = normalizeDocumentDraftContent(String(raw ?? "")).trim();
    return s || null;
  }

  if (
    type === "number" ||
    type === "rating" ||
    type === "scale" ||
    type === "counter"
  ) {
    const n =
      typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
    if (!Number.isFinite(n)) return null;
    let next = n;
    const min = field.validation?.min;
    const max = field.validation?.max;
    if (typeof min === "number" && next < min) next = min;
    if (typeof max === "number" && next > max) next = max;
    return next;
  }

  if (type === "checkbox") {
    if (typeof raw === "boolean") return raw;
    const s = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (["true", "1", "yes", "y", "예", "체크"].includes(s)) return true;
    if (["false", "0", "no", "n", "아니오"].includes(s)) return false;
    return null;
  }

  if (type === "select" || type === "radio") {
    const s = String(raw ?? "").trim();
    if (!s) return null;
    const options = field.options || [];
    if (options.length > 0 && !options.includes(s)) return null;
    return s;
  }

  if (type === "multiSelect" || type === "multiDate") {
    let arr: unknown[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === "string") {
      const t = raw.trim();
      if (t.startsWith("[")) {
        try {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) arr = parsed;
        } catch {
          arr = t.split(/[,|\n]/).map((x) => x.trim()).filter(Boolean);
        }
      } else {
        arr = t.split(/[,|\n]/).map((x) => x.trim()).filter(Boolean);
      }
    } else return null;
    const strings = arr.map((x) => String(x).trim()).filter(Boolean);
    if (type === "multiSelect") {
      const options = field.options || [];
      const filtered =
        options.length > 0
          ? strings.filter((s) => options.includes(s))
          : strings;
      return filtered.length ? filtered : null;
    }
    return strings.length ? strings : null;
  }

  if (type === "link") {
    if (typeof raw === "string") {
      const url = raw.trim();
      return url ? { url } : null;
    }
    if (raw && typeof raw === "object") {
      const url = String((raw as { url?: string }).url || "").trim();
      return url ? { url } : null;
    }
    return null;
  }

  if (type === "userSelect") {
    if (Array.isArray(raw)) {
      const users = raw
        .map((r) => findCandidate(userCandidates, r))
        .filter(Boolean) as TFormResponseUserCandidate[];
      return users.length ? users : null;
    }
    const one = findCandidate(userCandidates, raw);
    return one;
  }

  if (type === "approval") {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as { steps?: unknown[] };
    if (!Array.isArray(o.steps)) return null;
    const steps = o.steps
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const step = s as {
          order?: number;
          label?: string;
          mode?: string;
          approver?: unknown;
        };
        const approver = findCandidate(userCandidates, step.approver);
        if (!approver) return null;
        return {
          order: typeof step.order === "number" ? step.order : 0,
          label: String(step.label || ""),
          mode: "pick",
          approver,
        };
      })
      .filter(Boolean);
    return steps.length
      ? {
          version: 2,
          currentStep: 0,
          overallStatus: "pending",
          status: "pending",
          steps,
        }
      : null;
  }

  if (type === "circulation") {
    if (Array.isArray(raw)) {
      const users = raw
        .map((r) => findCandidate(userCandidates, r))
        .filter(Boolean) as TFormResponseUserCandidate[];
      return users.length ? users : null;
    }
    const one = findCandidate(userCandidates, raw);
    return one ? [one] : null;
  }

  return null;
};

export const applyFormResponseByField = (params: {
  byField: Record<string, unknown>;
  fields: TFormResponseFieldMeta[];
  current: Record<string, unknown>;
  userCandidates?: TFormResponseUserCandidate[];
  fillEmptyOnly?: boolean;
  setValue: (fieldId: string, value: unknown) => void;
}): { applied: number; skipped: number } => {
  const {
    byField,
    fields,
    current,
    userCandidates = [],
    fillEmptyOnly = false,
    setValue,
  } = params;
  const metaById = new Map(fields.map((f) => [f.fieldId, f]));
  let applied = 0;
  let skipped = 0;

  for (const [fieldId, raw] of Object.entries(byField || {})) {
    const meta = metaById.get(fieldId);
    if (!meta || !isFormResponseWritableType(String(meta.type))) {
      skipped += 1;
      continue;
    }
    if (fillEmptyOnly && !isEmptyValue(current[fieldId])) {
      skipped += 1;
      continue;
    }
    // 병합은 백엔드에서 끝남. 검증된 병합본만 그대로 반영한다.
    const next = coerceFormResponseValue(meta, raw, userCandidates);
    if (next == null) {
      skipped += 1;
      continue;
    }
    if (String(meta.type) === "docResponse" && typeof next === "string") {
      const base = String(
        current[fieldId] ?? meta.template ?? ""
      ).trim();
      if (base) {
        if (!isAcceptableMergedDocResponse(base, next)) {
          skipped += 1;
          continue;
        }
      } else if (isBrokenDocResponseImageDump(next)) {
        skipped += 1;
        continue;
      }
    }
    const prev = current[fieldId];
    const same =
      typeof next === "string" || typeof prev === "string"
        ? String(next ?? "") === String(prev ?? "")
        : JSON.stringify(next) === JSON.stringify(prev);
    if (same) {
      skipped += 1;
      continue;
    }
    setValue(fieldId, next);
    applied += 1;
  }

  return { applied, skipped };
};
