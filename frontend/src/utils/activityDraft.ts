import {
  TAltFormField,
  TAltFormFieldType,
  TAltFormSettings,
  TAssessmentSettings,
  TFormRubric,
  TQuizSettings,
} from "types/altForm";
import { normalizeDocumentDraftContent } from "utils/documentDraftMarkdown";
import { sanitizeHttpUrl } from "pages/boards/altBoard/formDocLink";

const FIELD_TYPES = new Set<TAltFormFieldType>([
  "text",
  "textarea",
  "number",
  "date",
  "multiDate",
  "time",
  "file",
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
  "content",
  "docResponse",
  "aiChat",
]);

const OPTION_TYPES = new Set<TAltFormFieldType>([
  "select",
  "multiSelect",
  "radio",
]);

const RUBRIC_TARGET_TYPES = new Set<TAltFormFieldType>([
  "textarea",
  "docResponse",
  "text",
  "file",
]);

export type TActivityAccessGroups = {
  manager: boolean;
  teacher: boolean;
  student: boolean;
};

export type TActivityDraftAccessSide =
  | "board"
  | { groups: TActivityAccessGroups };

export type TActivityDraftAccess = {
  members?: TActivityDraftAccessSide;
  writers?: TActivityDraftAccessSide;
};

export type TActivityBuilderSettings = {
  allowResubmit: boolean;
  allowMultipleResponses: boolean;
  requiredResponseCount: number;
  requiredMode: boolean;
  openAt: string;
  closeAt: string;
  weekdaySchedule: {
    enabled: boolean;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    endDayOffset: number;
  };
  quizMode: boolean;
  quizSettings: TQuizSettings;
  assessmentMode: boolean;
  assessmentSettings: TAssessmentSettings;
  directInputMode: boolean;
  shareResponses: boolean;
  showOwnerFields: boolean;
  showOwnResponse: boolean;
};

const defaultAssessmentSettings = (): TAssessmentSettings => ({
  revealOn: "finalized",
  finalEvaluation: { mode: "both" },
});

/** 빌더 datetime-local 입력용 (로컬 YYYY-MM-DDTHH:mm) */
export const toLocalDatetimeString = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** ISO 등 → datetime-local. 이미 local 형이면 그대로. 파싱 실패 시 빈 문자열 */
export const toBuilderDatetimeLocal = (raw: unknown): string => {
  const str = String(raw ?? "").trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalDatetimeString(d);
};

export const defaultActivitySettings = (): TActivityBuilderSettings => ({
  allowResubmit: false,
  allowMultipleResponses: false,
  requiredResponseCount: 2,
  requiredMode: false,
  openAt: "",
  closeAt: "",
  weekdaySchedule: {
    enabled: false,
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "18:00",
    endDayOffset: 0,
  },
  quizMode: false,
  quizSettings: {
    scoreReveal: "immediately",
    answerReveal: "afterDeadline",
    showWrongMarks: true,
  },
  assessmentMode: false,
  assessmentSettings: defaultAssessmentSettings(),
  directInputMode: false,
  shareResponses: false,
  showOwnerFields: false,
  showOwnResponse: true,
});

const ACCESS_GROUP_IDS: Array<keyof TActivityAccessGroups> = [
  "manager",
  "teacher",
  "student",
];
const MAX_DRAFT_LINKS = 10;
const DRAFT_LINK_TITLE_CHARS = 80;

const emptyAccessGroups = (): TActivityAccessGroups => ({
  manager: false,
  teacher: false,
  student: false,
});

const hasAnyAccessGroup = (groups?: TActivityAccessGroups | null) =>
  !!(groups && (groups.manager || groups.teacher || groups.student));

export const normalizeActivityDraftAccessSide = (
  raw: unknown
): TActivityDraftAccessSide | undefined => {
  if (raw == null || raw === false) return undefined;
  if (raw === true || raw === "board") return "board";
  if (typeof raw === "string" && raw.trim().toLowerCase() === "board") {
    return "board";
  }
  const flags = emptyAccessGroups();
  const applyId = (id: unknown) => {
    const k = String(id || "").trim().toLowerCase();
    if (k === "manager" || k === "teacher" || k === "student") {
      flags[k] = true;
    }
  };
  if (Array.isArray(raw)) {
    raw.forEach(applyId);
  } else if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.groups)) {
      obj.groups.forEach(applyId);
    } else if (obj.groups && typeof obj.groups === "object") {
      const g = obj.groups as Record<string, unknown>;
      for (const id of ACCESS_GROUP_IDS) flags[id] = !!g[id];
    } else {
      for (const id of ACCESS_GROUP_IDS) flags[id] = !!obj[id];
    }
  } else {
    return undefined;
  }
  if (!hasAnyAccessGroup(flags)) return undefined;
  return { groups: flags };
};

export const normalizeActivityDraftAccess = (
  raw: unknown
): TActivityDraftAccess | undefined => {
  if (raw === "board") {
    return { members: "board", writers: "board" };
  }
  if (raw == null || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  let members = normalizeActivityDraftAccessSide(obj.members);
  let writers = normalizeActivityDraftAccessSide(obj.writers);
  if (
    members &&
    members !== "board" &&
    writers &&
    writers !== "board"
  ) {
    const next = emptyAccessGroups();
    for (const id of ACCESS_GROUP_IDS) {
      next[id] = !!(writers.groups[id] && members.groups[id]);
    }
    writers = hasAnyAccessGroup(next) ? { groups: next } : undefined;
  }
  if (!members && !writers) return undefined;
  return {
    ...(members ? { members } : {}),
    ...(writers ? { writers } : {}),
  };
};

export const normalizeActivityDraftLinks = (raw: unknown) => {
  if (!Array.isArray(raw)) return undefined;
  const out: { url: string; title?: string }[] = [];
  for (const item of raw.slice(0, MAX_DRAFT_LINKS)) {
    const url = sanitizeHttpUrl(
      item && typeof item === "object"
        ? String((item as { url?: unknown }).url || "")
        : String(item || "")
    );
    if (!url) continue;
    const title = String(
      item && typeof item === "object"
        ? (item as { title?: unknown }).title || ""
        : ""
    )
      .trim()
      .slice(0, DRAFT_LINK_TITLE_CHARS);
    out.push(title ? { url, title } : { url });
  }
  return out.length ? out : undefined;
};

const createEmptyField = (type: TAltFormFieldType): TAltFormField => ({
  _id: crypto.randomUUID(),
  label: "",
  type,
  permission: "respondent",
  visibleToRespondent: false,
  required: false,
  options: OPTION_TYPES.has(type) ? ["옵션 1", "옵션 2"] : [],
  content:
    type === "content" || type === "docResponse" || type === "aiChat"
      ? ""
      : undefined,
  approvalLine:
    type === "approval"
      ? { steps: [{ order: 0, label: "1차 승인", mode: "pick" }] }
      : undefined,
  circulation:
    type === "circulation" ? { mode: "pick", users: [] } : undefined,
  order: 0,
});

const DEFAULT_RUBRIC_LEVELS = [
  { label: "우수", description: "기대 수준을 충족하거나 뛰어남", points: 3 },
  { label: "보통", description: "기본 기대를 충족함", points: 2 },
  { label: "노력 필요", description: "추가 연습·지도가 필요함", points: 1 },
];

export const normalizeActivityDraftSettings = (
  raw: unknown,
  fallback?: TActivityBuilderSettings
): TActivityBuilderSettings => {
  const base = fallback || defaultActivitySettings();
  const s = raw && typeof raw === "object" ? (raw as Record<string, any>) : {};
  let quizMode = !!s.quizMode;
  let assessmentMode = !!s.assessmentMode;
  if (quizMode && assessmentMode) assessmentMode = false;

  const qs = s.quizSettings || {};
  return {
    ...base,
    allowResubmit: s.allowResubmit != null ? !!s.allowResubmit : base.allowResubmit,
    allowMultipleResponses:
      s.allowMultipleResponses != null
        ? !!s.allowMultipleResponses
        : base.allowMultipleResponses,
    requiredMode: s.requiredMode != null ? !!s.requiredMode : base.requiredMode,
    requiredResponseCount:
      typeof s.requiredResponseCount === "number" &&
      Number.isFinite(s.requiredResponseCount)
        ? Math.max(1, Math.floor(s.requiredResponseCount))
        : base.requiredResponseCount,
    openAt: toBuilderDatetimeLocal(
      s.openAt != null ? s.openAt : base.openAt
    ),
    closeAt: toBuilderDatetimeLocal(
      s.closeAt != null ? s.closeAt : base.closeAt
    ),
    weekdaySchedule: (() => {
      const ws = s.weekdaySchedule;
      const fallback = base.weekdaySchedule || {
        enabled: false,
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "18:00",
        endDayOffset: 0,
      };
      if (!ws || typeof ws !== "object") return fallback;
      const days = Array.isArray(ws.daysOfWeek)
        ? ws.daysOfWeek
            .map((d: unknown) => Number(d))
            .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
        : fallback.daysOfWeek;
      const offsetRaw = Number((ws as { endDayOffset?: unknown }).endDayOffset);
      const endDayOffset =
        Number.isInteger(offsetRaw) && offsetRaw >= 0 && offsetRaw <= 14
          ? offsetRaw
          : fallback.endDayOffset ?? 0;
      return {
        enabled: !!ws.enabled,
        daysOfWeek: days.length ? days : fallback.daysOfWeek,
        startTime:
          typeof ws.startTime === "string" && ws.startTime
            ? ws.startTime
            : fallback.startTime,
        endTime:
          typeof ws.endTime === "string" && ws.endTime
            ? ws.endTime
            : fallback.endTime,
        endDayOffset,
      };
    })(),
    quizMode,
    quizSettings: {
      scoreReveal: ["immediately", "afterDeadline", "never"].includes(
        qs.scoreReveal
      )
        ? qs.scoreReveal
        : base.quizSettings.scoreReveal,
      answerReveal: ["immediately", "afterDeadline", "never"].includes(
        qs.answerReveal
      )
        ? qs.answerReveal
        : base.quizSettings.answerReveal,
      showWrongMarks:
        qs.showWrongMarks != null
          ? !!qs.showWrongMarks
          : base.quizSettings.showWrongMarks,
    },
    assessmentMode,
    assessmentSettings: defaultAssessmentSettings(),
    directInputMode:
      s.directInputMode != null ? !!s.directInputMode : base.directInputMode,
    shareResponses:
      s.shareResponses != null ? !!s.shareResponses : base.shareResponses,
    showOwnerFields:
      s.showOwnerFields != null ? !!s.showOwnerFields : base.showOwnerFields,
    showOwnResponse:
      s.showOwnResponse != null ? !!s.showOwnResponse : base.showOwnResponse,
  };
};

/**
 * 서버에서 이미 연결한 루브릭 id를 유지하면서 필드·루브릭을 정규화한다.
 * (반영 시 id를 다시 만들면 rubricIds 연결이 끊김)
 */
export const normalizeActivityDraftBundle = (draft: {
  fields?: unknown;
  settings?: unknown;
  rubrics?: unknown;
  access?: unknown;
}): {
  fields: TAltFormField[];
  settings: TActivityBuilderSettings;
  rubrics: TFormRubric[];
  access?: TActivityDraftAccess;
} => {
  let settings = normalizeActivityDraftSettings(draft?.settings);
  const rawRubrics = Array.isArray(draft?.rubrics) ? draft.rubrics : [];
  if (rawRubrics.length > 0 && !settings.quizMode) {
    settings = { ...settings, assessmentMode: true };
  }

  const rubricIdByRef = new Map<string, string>();
  let rubrics: TFormRubric[] = [];

  if (settings.assessmentMode) {
    const source =
      rawRubrics.length > 0
        ? rawRubrics
        : [
            {
              key: "default",
              title: "평가 루브릭",
              levels: DEFAULT_RUBRIC_LEVELS,
            },
          ];
    rubrics = source.slice(0, 10).map((r: any, ri: number) => {
      const id = String(r?.id || "").trim() || crypto.randomUUID();
      const title =
        String(r?.title || `루브릭 ${ri + 1}`).trim() || `루브릭 ${ri + 1}`;
      const key = String(r?.key || r?.id || "").trim();
      if (key) {
        rubricIdByRef.set(key, id);
        rubricIdByRef.set(key.toLowerCase(), id);
      }
      rubricIdByRef.set(id, id);
      rubricIdByRef.set(String(ri), id);
      rubricIdByRef.set(`index:${ri}`, id);
      rubricIdByRef.set(title.toLowerCase(), id);
      const levels = Array.isArray(r?.levels) && r.levels.length > 0
        ? r.levels.slice(0, 8).map((lv: any, li: number) => ({
            id: String(lv?.id || "").trim() || crypto.randomUUID(),
            label: String(lv?.label || `수준 ${li + 1}`).trim(),
            description: String(lv?.description || ""),
            points:
              typeof lv?.points === "number" && Number.isFinite(lv.points)
                ? lv.points
                : undefined,
          }))
        : DEFAULT_RUBRIC_LEVELS.map((lv) => ({
            id: crypto.randomUUID(),
            ...lv,
          }));
      return { id, title, levels };
    });
  }

  const defaultRubricIds = rubrics.length > 0 ? [rubrics[0].id] : [];
  const validRubricIds = new Set(rubrics.map((r) => r.id));

  const resolveRefs = (raw: any): string[] => {
    const refs: unknown[] = [];
    if (Array.isArray(raw?.rubricIds)) refs.push(...raw.rubricIds);
    if (raw?.rubricId != null) refs.push(raw.rubricId);
    if (Array.isArray(raw?.rubricKeys)) refs.push(...raw.rubricKeys);
    if (raw?.rubricKey != null) refs.push(raw.rubricKey);
    if (Array.isArray(raw?.rubricTitles)) refs.push(...raw.rubricTitles);
    if (Array.isArray(raw?.rubricIndexes)) refs.push(...raw.rubricIndexes);
    if (typeof raw?.rubricIndex === "number") refs.push(raw.rubricIndex);
    const ids: string[] = [];
    for (const ref of refs) {
      if (ref == null || ref === "") continue;
      const key = String(ref).trim();
      const resolved =
        rubricIdByRef.get(key) ||
        rubricIdByRef.get(key.toLowerCase()) ||
        rubricIdByRef.get(`index:${key}`);
      if (resolved && validRubricIds.has(resolved) && !ids.includes(resolved)) {
        ids.push(resolved);
      }
    }
    return ids;
  };

  const fields: TAltFormField[] = [];
  const rawFields = Array.isArray(draft?.fields) ? draft.fields : [];
  for (const raw of rawFields.slice(0, 40) as any[]) {
    const type = String(raw?.type || "") as TAltFormFieldType;
    if (!FIELD_TYPES.has(type)) continue;
    const base = createEmptyField(type);
    const keepId = String(raw?._id || "").trim();
    if (keepId) base._id = keepId;
    const label = String(raw?.label || "").trim();
    base.label =
      label ||
      (type === "content"
        ? "안내"
        : type === "docResponse"
          ? "응답 문서"
          : type === "aiChat"
            ? "AI 챗봇"
            : "항목");
    base.permission = raw?.permission === "owner" ? "owner" : "respondent";
    base.visibleToRespondent =
      base.permission === "owner" ? !!raw?.visibleToRespondent : false;
    base.required = !!raw?.required;
    if (OPTION_TYPES.has(type)) {
      const opts = Array.isArray(raw?.options)
        ? raw.options
            .map((o: unknown) => String(o ?? "").trim())
            .filter(Boolean)
            .slice(0, 30)
        : [];
      base.options = opts.length > 0 ? opts : ["옵션 1", "옵션 2"];
    }
    if (type === "content" || type === "docResponse" || type === "aiChat") {
      base.content = normalizeDocumentDraftContent(String(raw?.content || ""));
      const links = normalizeActivityDraftLinks(raw?.links);
      if (links) base.links = links;
    }
    if (typeof raw?.points === "number") base.points = raw.points;
    if (raw?.correctAnswer != null) base.correctAnswer = raw.correctAnswer;
    const gm = String(raw?.gradingMethod || "");
    if (["none", "completion", "manual_score", "rubric"].includes(gm)) {
      base.gradingMethod = gm as TAltFormField["gradingMethod"];
    }

    if (settings.assessmentMode && rubrics.length > 0) {
      const linked = resolveRefs(raw);
      if (base.gradingMethod === "rubric" || linked.length > 0) {
        base.gradingMethod = "rubric";
        base.rubricIds = linked.length > 0 ? linked : [...defaultRubricIds];
      }
    }

    base.order = fields.length;
    fields.push(base);
  }

  if (settings.assessmentMode && rubrics.length > 0) {
    const hasLinked = fields.some(
      (f) => f.gradingMethod === "rubric" && (f.rubricIds?.length || 0) > 0
    );
    if (!hasLinked) {
      let assigned = 0;
      for (const field of fields) {
        if (!RUBRIC_TARGET_TYPES.has(field.type)) continue;
        field.gradingMethod = "rubric";
        field.rubricIds = [...defaultRubricIds];
        assigned += 1;
        if (assigned >= 5) break;
      }
      if (assigned === 0 && fields.length > 0) {
        const target =
          fields.find((f) => f.type !== "content") || fields[0];
        target.gradingMethod = "rubric";
        target.rubricIds = [...defaultRubricIds];
      }
    }
  }

  if (!settings.assessmentMode) {
    for (const field of fields) {
      if (field.gradingMethod === "rubric") delete field.gradingMethod;
      delete field.rubricIds;
    }
    rubrics = [];
  }

  const access = normalizeActivityDraftAccess(draft?.access);

  return { fields, settings, rubrics, ...(access ? { access } : {}) };
};

/** @deprecated prefer normalizeActivityDraftBundle */
export const normalizeActivityDraftFields = (
  rawFields: unknown
): TAltFormField[] =>
  normalizeActivityDraftBundle({ fields: rawFields, settings: {} }).fields;

/** @deprecated prefer normalizeActivityDraftBundle */
export const normalizeActivityDraftRubrics = (raw: unknown): TFormRubric[] =>
  normalizeActivityDraftBundle({
    fields: [],
    settings: { assessmentMode: true },
    rubrics: raw,
  }).rubrics;

/** API/스냅샷용 settings 축약 */
export const toActivitySettingsSnapshot = (
  settings: TActivityBuilderSettings
): TAltFormSettings & Record<string, unknown> => ({
  allowResubmit: settings.allowResubmit,
  allowMultipleResponses: settings.allowMultipleResponses,
  requiredMode: settings.requiredMode,
  requiredResponseCount: settings.requiredResponseCount,
  openAt: settings.openAt || undefined,
  closeAt: settings.closeAt || undefined,
  weekdaySchedule: settings.weekdaySchedule?.enabled
    ? settings.weekdaySchedule
    : undefined,
  quizMode: settings.quizMode,
  quizSettings: settings.quizSettings,
  assessmentMode: settings.assessmentMode,
  assessmentSettings: settings.assessmentSettings,
  directInputMode: settings.directInputMode,
  shareResponses: settings.shareResponses,
  showOwnerFields: settings.showOwnerFields,
  showOwnResponse: settings.showOwnResponse,
});

export const ACTIVITY_ACCESS_GROUP_LABELS: Record<
  keyof TActivityAccessGroups,
  string
> = {
  manager: "관리자",
  teacher: "교사",
  student: "학생",
};

export const toActivityAccessSnapshot = (
  restrictMembers: boolean,
  memberGroups: TActivityAccessGroups,
  restrictWriters: boolean,
  writerGroups: TActivityAccessGroups
): TActivityDraftAccess => ({
  members: restrictMembers ? { groups: { ...memberGroups } } : "board",
  writers: restrictWriters ? { groups: { ...writerGroups } } : "board",
});

export const formatActivityAccessGroups = (
  side?: TActivityDraftAccessSide
): string | null => {
  if (!side || side === "board") return null;
  const labels = ACCESS_GROUP_IDS.filter((id) => side.groups[id]).map(
    (id) => ACTIVITY_ACCESS_GROUP_LABELS[id]
  );
  return labels.length ? labels.join("·") : null;
};
