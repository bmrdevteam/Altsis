import { TAlterSkillId } from "contexts/alterContext";
import {
  isActivityDraft,
  isArchiveDraft,
  isAssessmentGradeDraft,
  isDocumentDraft,
  isEvalDraft,
  isFormDraft,
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
};

/**
 * Alter.module.scss skillTone* — 보드 BoardListFilterBar filterChipTone* 매핑
 * @see frontend/src/pages/boards/boards.module.scss
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
  | "skillToneAssessmentGrade";

export const SKILL_TONE_KEY: Record<TAlterSkillId, SkillToneKey> = {
  chat: "skillToneChat", // Optional · 일반
  "syllabus-draft": "skillToneSyllabus", // Pending · 수업
  "evaluation-draft": "skillToneEvaluation", // Approval · 할 일
  "archive-draft": "skillToneArchive", // Draft
  "document-draft": "skillToneDocument", // Scheduled
  "document-review": "skillToneDocumentReview", // Closed
  "form-response-draft": "skillToneFormResponse", // Submitted
  "activity-draft": "skillToneActivity", // Direct
  "form-draft": "skillToneForm",
  "assessment-grade": "skillToneAssessmentGrade", // Approval
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
  }
  return parts;
};

/** dense prep(평가·기록)은 기본 접기 */
export const shouldDefaultCollapsePrep = (skill: TAlterSkillId): boolean =>
  skill === "evaluation-draft" || skill === "archive-draft";
