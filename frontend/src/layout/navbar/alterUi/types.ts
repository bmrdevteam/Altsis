export type TAlterEvalDraftResult = {
  kind?: "evaluation";
  targetLabels: string[];
  fillEmptyOnly: boolean;
  csv: string;
  rows: Array<{
    studentId: string;
    studentName?: string;
    studentGrade?: string;
    values: Record<string, string>;
  }>;
};

export type TAlterArchiveDraftResult = {
  kind: "archive";
  writeMode?: "perStudent" | "sameText";
  targetLabels: string[];
  fillEmptyOnly: boolean;
  rows: Array<{
    studentId: string;
    studentName?: string;
    studentGrade?: string;
    values: Record<string, string>;
  }>;
};

export type TAlterDocumentDraftResult = {
  kind: "document";
  writeMode?: "create" | "refine";
  docType?: string;
  title: string;
  content: string;
};

export type TAlterReviewLevel = "good" | "fair" | "needs_work" | "empty";

export type TAlterDocumentReviewResult = {
  summary: string;
  overallLevel: TAlterReviewLevel | string;
  items: Array<{
    field: string;
    level: TAlterReviewLevel | string;
    comment: string;
    suggestion: string;
    quote?: string;
    exampleBefore?: string;
    exampleAfter?: string;
  }>;
};

export type TAlterFormResponseDraftResult = {
  kind: "form-response";
  writeMode?: "create" | "refine";
  fillEmptyOnly?: boolean;
  byField: Record<string, unknown>;
};

export type TAlterActivityDraftResult = {
  kind: "activity";
  writeMode?: "create" | "refine";
  formType?: string;
  title: string;
  description?: string;
  fields: Array<{
    label?: string;
    type?: string;
    required?: boolean;
    permission?: string;
    options?: string[];
    content?: string;
    links?: Array<{ url?: string; title?: string }>;
    gradingMethod?: string;
    rubricIds?: string[];
    rubricKeys?: string[];
  }>;
  settings?: Record<string, unknown>;
  access?: {
    members?: "board" | { groups?: Record<string, boolean> };
    writers?: "board" | { groups?: Record<string, boolean> };
  };
  rubrics?: Array<{
    id?: string;
    key?: string;
    title?: string;
    levels?: Array<{ label?: string; points?: number }>;
  }>;
};

export type TAlterAssessmentGradeDraftResult = {
  kind: "assessment-grade";
  fillEmptyOnly?: boolean;
  byField?: Record<
    string,
    {
      score?: number;
      levelId?: string;
      comment?: string;
      byRubric?: Record<string, { levelId?: string; comment?: string }>;
    }
  >;
  final?: { comment?: string };
};

export type TAlterSyllabusDraftResult = {
  kind: "syllabus";
  summary?: string;
  items: Array<{ field: string; value: string }>;
};

export type TAlterDraftResult =
  | TAlterEvalDraftResult
  | TAlterArchiveDraftResult
  | TAlterDocumentDraftResult
  | TAlterFormResponseDraftResult
  | TAlterActivityDraftResult
  | TAlterAssessmentGradeDraftResult
  | TAlterSyllabusDraftResult;

export type TGuidelineItem = {
  _id: string;
  title: string;
  content?: string;
};

export const isSyllabusDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterSyllabusDraftResult => {
  if (!draft) return false;
  if (draft.kind === "syllabus") return true;
  const anyDraft = draft as unknown as {
    items?: unknown;
    rows?: unknown;
  };
  return Array.isArray(anyDraft.items) && !Array.isArray(anyDraft.rows);
};

export const isArchiveDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterArchiveDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "archive";
};

export const isDocumentDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterDocumentDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "document";
};

export const isFormResponseDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterFormResponseDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "form-response";
};

export const isActivityDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterActivityDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "activity";
};

export const isAssessmentGradeDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterAssessmentGradeDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "assessment-grade";
};

export const isEvalDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterEvalDraftResult => {
  if (
    !draft ||
    isArchiveDraft(draft) ||
    isDocumentDraft(draft) ||
    isFormResponseDraft(draft) ||
    isActivityDraft(draft) ||
    isAssessmentGradeDraft(draft)
  )
    return false;
  const anyDraft = draft as unknown as { rows?: unknown; kind?: string };
  return Array.isArray(anyDraft.rows) && anyDraft.kind !== "archive";
};
