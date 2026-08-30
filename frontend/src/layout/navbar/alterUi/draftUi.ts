import { TAlterSkillId } from "contexts/alterContext";
import {
  isActivityDraft,
  isArchiveDraft,
  isAssessmentGradeDraft,
  isDocumentDraft,
  isEvalDraft,
  isFormDraft,
  isFormResponseDraft,
  isSearchDraft,
  isSyllabusDraft,
  TAlterDraftResult,
  TAlterDocumentReviewResult,
} from "./types";

export type ApplyPolicy = "once" | "reapply";

export type DraftMetaVariant =
  | "neutral"
  | "good"
  | "fair"
  | "needs"
  | "empty";

export const DOCUMENT_DOC_TYPES: Array<{ id: string; label: string }> = [
  { id: "manual", label: "매뉴얼·안내" },
  { id: "notice", label: "공지" },
  { id: "minutes", label: "회의록" },
  { id: "checklist", label: "체크리스트" },
  { id: "table", label: "표 중심 안내" },
  { id: "lesson", label: "학습 자료" },
  { id: "general", label: "일반 문서" },
];

export const ACTIVITY_FORM_TYPES: Array<{ id: string; label: string }> = [
  { id: "survey", label: "설문·조사" },
  { id: "quiz", label: "퀴즈" },
  { id: "application", label: "신청·접수" },
  { id: "checklist", label: "체크리스트" },
  { id: "interactive", label: "인터랙티브(학습 도구)" },
  { id: "assessment", label: "평가 활동" },
  { id: "general", label: "일반 활동" },
];

export const REVIEW_LEVEL_LABEL: Record<string, string> = {
  good: "충족",
  fair: "보통",
  needs_work: "보완 필요",
  empty: "미작성",
};

export const reviewLevelToVariant = (level?: string): DraftMetaVariant => {
  if (level === "good") return "good";
  if (level === "fair") return "fair";
  if (level === "empty") return "empty";
  return "needs";
};

/** once: 수업·평가·기록 / reapply: 문서·응답·활동·채점 */
export const applyPolicyForDraft = (
  draft: TAlterDraftResult
): ApplyPolicy | null => {
  if (isSyllabusDraft(draft) || isEvalDraft(draft) || isArchiveDraft(draft)) {
    return "once";
  }
  if (
    isDocumentDraft(draft) ||
    isFormResponseDraft(draft) ||
    isActivityDraft(draft) ||
    isFormDraft(draft) ||
    isAssessmentGradeDraft(draft)
  ) {
    return "reapply";
  }
  return null;
};

export const applyLabelForDraft = (
  draft: TAlterDraftResult,
  applied: boolean
): string => {
  const policy = applyPolicyForDraft(draft);
  if (!policy) return "반영";
  if (policy === "once") {
    if (applied) return "반영됨";
    if (isSyllabusDraft(draft)) return "계획서에 반영";
    return "미리보기에 반영";
  }
  if (applied) return "다시 반영";
  if (isDocumentDraft(draft)) return "문서에 반영";
  if (isFormResponseDraft(draft)) return "응답에 반영";
  if (isActivityDraft(draft)) return "양식에 반영";
  if (isFormDraft(draft)) return "에디터에 반영";
  if (isAssessmentGradeDraft(draft)) return "채점에 반영";
  return "반영";
};

export const isApplyDisabled = (
  draft: TAlterDraftResult,
  applied: boolean
): boolean => {
  const policy = applyPolicyForDraft(draft);
  return policy === "once" && applied;
};

export type PrepKind =
  | "syllabus"
  | "evaluation"
  | "archive"
  | "document"
  | "document-review"
  | "form-response"
  | "activity"
  | "form"
  | "assessment-grade"
  | "search"
  | null;

export const prepKindFromSkill = (
  showPrep: boolean,
  skill: TAlterSkillId
): PrepKind => {
  if (!showPrep) return null;
  switch (skill) {
    case "syllabus-draft":
      return "syllabus";
    case "evaluation-draft":
      return "evaluation";
    case "archive-draft":
      return "archive";
    case "document-draft":
      return "document";
    case "document-review":
      return "document-review";
    case "form-response-draft":
      return "form-response";
    case "activity-draft":
      return "activity";
    case "form-draft":
      return "form";
    case "assessment-grade":
      return "assessment-grade";
    case "search":
      return "search";
    default:
      return null;
  }
};

type MessageLike = {
  draft?: TAlterDraftResult | null;
  review?: TAlterDocumentReviewResult | null;
};

const messageMatchesPrep = (
  m: MessageLike,
  prepKind: PrepKind
): boolean => {
  if (!prepKind) return false;
  if (prepKind === "document-review") return !!m.review;
  if (!m.draft) return false;
  switch (prepKind) {
    case "syllabus":
      return isSyllabusDraft(m.draft);
    case "evaluation":
      return isEvalDraft(m.draft);
    case "archive":
      return isArchiveDraft(m.draft);
    case "document":
      return isDocumentDraft(m.draft);
    case "form-response":
      return isFormResponseDraft(m.draft);
    case "activity":
      return isActivityDraft(m.draft);
    case "form":
      return isFormDraft(m.draft);
    case "assessment-grade":
      return isAssessmentGradeDraft(m.draft);
    case "search":
      return isSearchDraft(m.draft);
    default:
      return false;
  }
};

export const prepPrimaryLabel = (
  prepKind: PrepKind,
  messages: MessageLike[]
): string => {
  if (!prepKind) return "보내기";
  const hasResult = messages.some((m) => messageMatchesPrep(m, prepKind));
  if (prepKind === "document-review") {
    return hasResult ? "다시 점검" : "문서 점검";
  }
  if (prepKind === "assessment-grade") {
    return hasResult ? "다시 작성" : "채점 초안 작성";
  }
  if (prepKind === "search") {
    return hasResult ? "다시 검색" : "검색";
  }
  return hasResult ? "다시 작성" : "초안 작성";
};

export const docTypeLabel = (docType?: string) =>
  DOCUMENT_DOC_TYPES.find((t) => t.id === docType)?.label || docType || "";

export const activityFormTypeLabel = (formType?: string) =>
  ACTIVITY_FORM_TYPES.find((t) => t.id === formType)?.label || formType || "";

export const adminFormTypeLabel = (formType?: string) =>
  formType === "syllabus"
    ? "강의계획서"
    : formType === "print"
      ? "출력"
      : formType === "timetable"
        ? "시간표"
        : formType || "";

export const SKILL_CHIP_HINT: Record<TAlterSkillId, string> = {
  chat: "페이지 데이터를 참고해 질문·설명에 답합니다",
  "syllabus-draft": "학습 계획서 항목 초안을 만듭니다",
  "evaluation-draft": "수업 평가(멘토평가 등) 초안을 만듭니다",
  "archive-draft": "학생 기록(행동특성·종합의견 등) 초안을 만듭니다",
  "document-draft": "보드 문서 초안을 작성·다듬습니다",
  "document-review": "문서 내용을 지침 기준으로 점검합니다",
  "form-response-draft": "양식 응답·기안문 초안을 채웁니다",
  "activity-draft": "활동 양식(필드·설정) 초안을 만듭니다",
  "form-draft": "시간표·강의계획서·출력 양식 문서를 작성·다듬습니다",
  "assessment-grade": "평가 활동 응답을 채점 초안으로 채웁니다",
  search: "권한 있는 학사 데이터를 찾아 표·통계로 보여 줍니다",
};

/**
 * Alter.module.scss skillTone* — 스킬마다 고유 색 (일부는 보드 필터 톤과 같음)
 * @see frontend/src/layout/navbar/Alter.module.scss
 */
export type SkillToneKey =
  | "skillToneChat"
  | "skillToneSyllabus"
  | "skillToneEvaluation"
  | "skillToneArchive"
  | "skillToneDocument"
  | "skillToneDocumentReview"
  | "skillToneFormResponse"
  | "skillToneActivity"
  | "skillToneForm"
  | "skillToneAssessmentGrade"
  | "skillToneSearch";

export const SKILL_TONE_KEY: Record<TAlterSkillId, SkillToneKey> = {
  chat: "skillToneChat", // Optional · 일반
  "syllabus-draft": "skillToneSyllabus", // Pending · 수업
  "evaluation-draft": "skillToneEvaluation", // Approval · 할 일
  "archive-draft": "skillToneArchive", // Draft
  "document-draft": "skillToneDocument", // Scheduled
  "document-review": "skillToneDocumentReview", // Closed
  "form-response-draft": "skillToneFormResponse", // 초록 · Submitted
  "activity-draft": "skillToneActivity", // 로즈
  "form-draft": "skillToneForm", // 하늘
  "assessment-grade": "skillToneAssessmentGrade", // 딥오렌지
  search: "skillToneSearch", // 인디고
};

export const alterModeLabel = (inPrep: boolean): "질문" | "작성·점검" =>
  inPrep ? "작성·점검" : "질문";

/** 접힌 prep dock에 보여줄 짧은 요약 조각 */
export const buildPrepSummaryParts = (input: {
  prepKind: PrepKind;
  evalTargetCount?: number;
  evalStudentCount?: number;
  evalFillEmptyOnly?: boolean;
  archiveTargetCount?: number;
  archiveStudentCount?: number;
  archiveFillEmptyOnly?: boolean;
  archiveWriteMode?: "perStudent" | "sameText";
  docWriteMode?: "create" | "refine";
  docTypeLabel?: string;
  formResponseFieldCount?: number;
  formResponseFillEmptyOnly?: boolean;
  activityFormTypeLabel?: string;
  activityWriteMode?: "create" | "refine";
  formWriteMode?: "create" | "refine";
  formTypeLabel?: string;
  gradeFillEmptyOnly?: boolean;
  gradeLabel?: string;
  guidelineCount?: number;
  searchSeasonScope?: "current" | "activated" | "season" | "school";
}): string[] => {
  const parts: string[] = [];
  const { prepKind } = input;
  if (!prepKind) return parts;

  if (prepKind === "evaluation") {
    if (input.evalTargetCount != null) {
      parts.push(`항목 ${input.evalTargetCount}`);
    }
    if (input.evalStudentCount != null) {
      parts.push(`학생 ${input.evalStudentCount}`);
    }
    parts.push(input.evalFillEmptyOnly ? "빈 칸만" : "종합 재작성");
  } else if (prepKind === "archive") {
    if (input.archiveTargetCount != null) {
      parts.push(`항목 ${input.archiveTargetCount}`);
    }
    if (input.archiveStudentCount != null) {
      parts.push(`학생 ${input.archiveStudentCount}`);
    }
    if (input.archiveWriteMode === "sameText") parts.push("동일 문구");
    parts.push(input.archiveFillEmptyOnly ? "빈 칸만" : "덮어쓰기 가능");
  } else if (prepKind === "document") {
    parts.push(input.docWriteMode === "refine" ? "다듬기" : "새 작성");
    if (input.docTypeLabel) parts.push(input.docTypeLabel);
  } else if (prepKind === "document-review") {
    if (input.guidelineCount != null) {
      parts.push(`지침 ${input.guidelineCount}`);
    }
  } else if (prepKind === "form-response") {
    if (input.formResponseFieldCount != null) {
      parts.push(`필드 ${input.formResponseFieldCount}`);
    }
    if (input.formResponseFillEmptyOnly) parts.push("빈 칸만");
  } else if (prepKind === "activity") {
    parts.push(input.activityWriteMode === "refine" ? "다듬기" : "새 작성");
    if (input.activityFormTypeLabel) parts.push(input.activityFormTypeLabel);
  } else if (prepKind === "form") {
    parts.push(input.formWriteMode === "refine" ? "다듬기" : "새 작성");
    if (input.formTypeLabel) parts.push(input.formTypeLabel);
  } else if (prepKind === "assessment-grade") {
    if (input.gradeLabel) parts.push(input.gradeLabel);
    parts.push(input.gradeFillEmptyOnly ? "빈 칸만" : "덮어쓰기");
  } else if (prepKind === "syllabus") {
    if (input.guidelineCount != null) {
      parts.push(`지침 ${input.guidelineCount}`);
    }
  } else if (prepKind === "search") {
    parts.push(
      input.searchSeasonScope === "activated" ? "활성 학기 전부" : "현재 학기"
    );
  }
  return parts;
};

/** dense prep(평가·기록)은 기본 접기 */
export const shouldDefaultCollapsePrep = (skill: TAlterSkillId): boolean =>
  skill === "evaluation-draft" || skill === "archive-draft";

export const canActivateRefinePrompt = ({
  usageLimitExceeded = false,
  isWorking = false,
  isRefining = false,
  attachUploading = false,
}: {
  usageLimitExceeded?: boolean;
  isWorking?: boolean;
  isRefining?: boolean;
  attachUploading?: boolean;
} = {}) =>
  !usageLimitExceeded && !isWorking && !isRefining && !attachUploading;

export const fullscreenToggleLabel = (isFullscreen: boolean) =>
  isFullscreen ? "원래 크기" : "전체 화면";

export const searchCodeToggleLabel = (open: boolean) =>
  open ? "코드 접기" : "코드 보기";

export const sourceToggleLabel = (open: boolean) =>
  open ? "원문 접기" : "원문 보기";

export const searchPdfLabel = () => "PDF 받기";

export const searchHasCode = (draft?: {
  sql?: string;
  vizCode?: string;
} | null) =>
  Boolean(String(draft?.sql || "").trim() || String(draft?.vizCode || "").trim());

/** 요청 다듬기용 현재 내용 발췌 상한 (서버 REFINE_PROMPT_EXCERPT_CHARS와 맞춤) */
export const REFINE_CONTENT_EXCERPT_MAX = 2500;

export const clipRefineExcerpt = (
  text: string,
  max = REFINE_CONTENT_EXCERPT_MAX
) => {
  const value = String(text || "").trim();
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, max)}…`;
};

const markdownOutline = (content: string, limit = 12) =>
  String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s+\S/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim())
    .filter(Boolean)
    .slice(0, limit);

const collectPlainStrings = (
  value: unknown,
  out: string[],
  depth = 0
) => {
  if (out.length >= 36 || depth > 4) return;
  if (typeof value === "string") {
    const text = value.trim();
    if (
      text &&
      !text.startsWith("data:") &&
      !/^https?:\/\//i.test(text) &&
      text.length < 1600
    ) {
      out.push(text);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectPlainStrings(item, out, depth + 1));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (/^(id|_id|key|src|url|file|mime)/i.test(key)) return;
      collectPlainStrings(item, out, depth + 1);
    });
  }
};

const formatResponseValue = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatResponseValue(item))
      .filter(Boolean)
      .join(", ");
  }
  return "";
};

export type RefineContentExcerptInput = {
  skill: TAlterSkillId;
  document?: { title?: string; content?: string } | null;
  reviewDocument?: {
    title?: string;
    content?: string;
    fieldNames?: string[];
  } | null;
  formResponse?: {
    formTitle?: string;
    fields?: Array<{ fieldId: string; label?: string }>;
    responses?: Record<string, unknown>;
    targetFieldIds?: string[];
  } | null;
  activity?: {
    title?: string;
    description?: string;
    fields?: Array<{ label?: string; type?: string }>;
  } | null;
  form?: {
    title?: string;
    formType?: string;
    blocks?: unknown[];
  } | null;
  syllabusInfo?: Record<string, unknown> | null;
  evaluationTargets?: string[];
  archiveTargets?: string[];
  grade?: {
    formTitle?: string;
    fields?: Array<{ label?: string }>;
    responses?: Record<string, string>;
  } | null;
  chatSummary?: string;
};

/**
 * 요청 다듬기가 현재 화면 내용을 이해하도록 짧은 발췌를 만든다.
 * 학생 이름·파일 URL은 넣지 않는다.
 */
export const buildRefineContentExcerpt = (
  input: RefineContentExcerptInput
) => {
  const lines: string[] = [];
  const skill = input.skill;

  if (skill === "document-review") {
    const doc = input.reviewDocument || input.document;
    if (doc?.title) lines.push(`제목: ${doc.title}`);
    const fields = input.reviewDocument?.fieldNames || [];
    if (fields.length) lines.push(`항목: ${fields.slice(0, 16).join(", ")}`);
    const outline = markdownOutline(doc?.content || "");
    if (outline.length) lines.push(`목차: ${outline.join(" · ")}`);
    if (doc?.content) lines.push(doc.content);
  } else if (skill === "document-draft") {
    const doc = input.document;
    if (doc?.title) lines.push(`제목: ${doc.title}`);
    const outline = markdownOutline(doc?.content || "");
    if (outline.length) lines.push(`목차: ${outline.join(" · ")}`);
    if (doc?.content) lines.push(doc.content);
  } else if (skill === "form-response-draft" && input.formResponse) {
    const snap = input.formResponse;
    if (snap.formTitle) lines.push(`양식: ${snap.formTitle}`);
    const fields = snap.fields || [];
    const targets = new Set(snap.targetFieldIds || []);
    const picked = targets.size
      ? fields.filter((f) => targets.has(f.fieldId))
      : fields;
    if (picked.length) {
      lines.push(
        `필드: ${picked
          .map((f) => f.label || f.fieldId)
          .filter(Boolean)
          .slice(0, 20)
          .join(", ")}`
      );
    }
    const replies = picked
      .map((f) => {
        const value = formatResponseValue(snap.responses?.[f.fieldId]);
        return value ? `- ${f.label || f.fieldId}: ${value}` : "";
      })
      .filter(Boolean)
      .slice(0, 12);
    if (replies.length) {
      lines.push("현재 응답:");
      lines.push(...replies);
    }
  } else if (skill === "activity-draft" && input.activity) {
    const act = input.activity;
    if (act.title) lines.push(`제목: ${act.title}`);
    if (act.description) lines.push(act.description);
    const labels = (act.fields || [])
      .map((f) => f.label)
      .filter(Boolean)
      .slice(0, 20);
    if (labels.length) lines.push(`필드: ${labels.join(", ")}`);
  } else if (skill === "form-draft" && input.form) {
    const form = input.form;
    if (form.title) lines.push(`제목: ${form.title}`);
    if (form.formType) lines.push(`유형: ${form.formType}`);
    const texts: string[] = [];
    collectPlainStrings(form.blocks || [], texts);
    if (texts.length) lines.push(texts.join("\n"));
  } else if (skill === "syllabus-draft" && input.syllabusInfo) {
    const entries = Object.entries(input.syllabusInfo)
      .map(([key, value]) => {
        const text = formatResponseValue(value);
        return text ? `- ${key}: ${text}` : "";
      })
      .filter(Boolean)
      .slice(0, 16);
    if (entries.length) {
      lines.push("현재 강의계획서:");
      lines.push(...entries);
    }
  } else if (skill === "evaluation-draft" && input.evaluationTargets?.length) {
    lines.push(`작성 항목: ${input.evaluationTargets.slice(0, 12).join(", ")}`);
  } else if (skill === "archive-draft" && input.archiveTargets?.length) {
    lines.push(`작성 항목: ${input.archiveTargets.slice(0, 12).join(", ")}`);
  } else if (skill === "assessment-grade" && input.grade) {
    const grade = input.grade;
    if (grade.formTitle) lines.push(`양식: ${grade.formTitle}`);
    const labels = (grade.fields || [])
      .map((f) => f.label)
      .filter(Boolean)
      .slice(0, 16);
    if (labels.length) lines.push(`채점 항목: ${labels.join(", ")}`);
    const replies = Object.entries(grade.responses || {})
      .map(([, value]) => formatResponseValue(value))
      .filter(Boolean)
      .slice(0, 6);
    if (replies.length) {
      lines.push("응답 발췌:");
      lines.push(...replies.map((text) => `- ${text}`));
    }
  } else if (input.chatSummary) {
    lines.push(input.chatSummary);
  }

  return clipRefineExcerpt(lines.filter(Boolean).join("\n"));
};
