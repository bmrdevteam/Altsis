import { TAlterSkillId } from "contexts/alterContext";
import {
  isActivityDraft,
  isArchiveDraft,
  isAssessmentGradeDraft,
  isDocumentDraft,
  isEvalDraft,
  isFormResponseDraft,
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
  | "assessment-grade"
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
    case "assessment-grade":
      return "assessment-grade";
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
    case "assessment-grade":
      return isAssessmentGradeDraft(m.draft);
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
  return hasResult ? "다시 작성" : "초안 작성";
};

export const docTypeLabel = (docType?: string) =>
  DOCUMENT_DOC_TYPES.find((t) => t.id === docType)?.label || docType || "";

export const activityFormTypeLabel = (formType?: string) =>
  ACTIVITY_FORM_TYPES.find((t) => t.id === formType)?.label || formType || "";
