import { TAlterSkillId } from "contexts/alterContext";

export type ResolveSendSkillArgs = {
  selectedSkill: TAlterSkillId;
  pageType?: string;
  text: string;
  hasSourceAttachments?: boolean;
};

const wantsSyllabusDraftText = (text: string) =>
  /계획서.*(초안|작성)/.test(text) ||
  /(초안|작성).*계획서/.test(text) ||
  /\/(계획서|syllabus[-_]?draft)/i.test(text) ||
  /^(점검|리뷰|피드백|다시\s*점검)/.test(text) ||
  /계획서.*(점검|리뷰)/.test(text) ||
  /\/(점검|review)/i.test(text);

const wantsEvalDraftText = (text: string) =>
  /평가.*(초안|작성)/.test(text) ||
  /(초안|작성).*평가/.test(text) ||
  /\/(평가|evaluation[-_]?draft)/i.test(text);

const wantsArchiveDraftText = (text: string) =>
  /기록.*(초안|작성)/.test(text) ||
  /(초안|작성).*기록/.test(text) ||
  /행동특성|종합의견/.test(text) ||
  /\/(기록|archive[-_]?draft)/i.test(text);

const wantsDocumentDraftText = (text: string) =>
  /문서.*(초안|작성|다듬)/.test(text) ||
  /(초안|작성|다듬).*문서/.test(text) ||
  /매뉴얼|회의록|공지문/.test(text) ||
  /\/(문서|document[-_]?draft)/i.test(text);

const wantsDocumentReviewText = (text: string) =>
  /문서.*(점검|검토|리뷰|피드백)/.test(text) ||
  /(점검|검토|리뷰|피드백).*문서/.test(text) ||
  /생활기록부.*(점검|검토|리뷰)/.test(text) ||
  /^(점검|검토|리뷰|피드백)/.test(text) ||
  /\/(문서[-_]?점검|document[-_]?review|점검|검토|review)/i.test(text);

/** 응답「초안 작성」의도만. 「작성한 응답에 대해…」피드백은 제외 */
const wantsFormResponseDraftText = (text: string) =>
  /\/(응답|form[-_]?response[-_]?draft)/i.test(text) ||
  /기안문.*(초안|작성|다듬)/.test(text) ||
  /응답\s*(을|를)?\s*(초안|작성|다듬|채우|채워)/.test(text) ||
  /(초안|다듬)\s*.*응답/.test(text);

const wantsActivityDraftText = (text: string) =>
  /활동.*(초안|작성|다듬|양식)/.test(text) ||
  /(초안|작성|다듬).*활동/.test(text) ||
  /\/(활동|activity[-_]?draft)/i.test(text);

const wantsFormDraftText = (text: string) =>
  /\/(양식|form[-_]?draft)/i.test(text) ||
  /(시간표|출력)\s*양식/.test(text) ||
  /강의계획서\s*양식/.test(text) ||
  (/양식.*(초안|작성|다듬)/.test(text) && !/활동/.test(text));

const explicitDraftSkill = (
  text: string,
  pageType: string | undefined,
  hasSourceAttachments: boolean
): TAlterSkillId | null => {
  if (wantsEvalDraftText(text) && pageType === "evaluation") {
    return "evaluation-draft";
  }
  if (wantsArchiveDraftText(text) && pageType === "archive") {
    return "archive-draft";
  }
  if (
    wantsDocumentReviewText(text) &&
    (pageType === "docs" || pageType === "document")
  ) {
    return "document-review";
  }
  if (wantsDocumentDraftText(text) && pageType === "document") {
    return "document-draft";
  }
  if (wantsFormResponseDraftText(text) && pageType === "form-response") {
    return "form-response-draft";
  }
  if (wantsActivityDraftText(text) && pageType === "activity") {
    return "activity-draft";
  }
  if (wantsFormDraftText(text) && pageType === "form-editor") {
    return "form-draft";
  }
  if (/채점/.test(text) && pageType === "assessment-grade") {
    return "assessment-grade";
  }
  if (
    (wantsSyllabusDraftText(text) || hasSourceAttachments) &&
    pageType === "syllabus-edit"
  ) {
    return "syllabus-draft";
  }
  return null;
};

/**
 * 전송 시 실행할 Alter 스킬.
 * 챗봇 칩에서는 메시지·화면과 관계없이 승격하지 않는다.
 */
export const resolveSendSkill = ({
  selectedSkill,
  pageType,
  text,
  hasSourceAttachments = false,
}: ResolveSendSkillArgs): TAlterSkillId => {
  if (selectedSkill === "chat") return "chat";

  const upgraded = explicitDraftSkill(text, pageType, hasSourceAttachments);
  if (upgraded) return upgraded;

  if (selectedSkill === "syllabus-draft" && pageType === "syllabus-edit") {
    return "syllabus-draft";
  }
  if (
    selectedSkill === "document-review" &&
    (pageType === "docs" || pageType === "document")
  ) {
    return "document-review";
  }
  if (selectedSkill === "document-draft" && pageType === "document") {
    return "document-draft";
  }
  if (
    selectedSkill === "form-response-draft" &&
    pageType === "form-response"
  ) {
    return "form-response-draft";
  }
  if (selectedSkill === "activity-draft" && pageType === "activity") {
    return "activity-draft";
  }
  if (selectedSkill === "form-draft" && pageType === "form-editor") {
    return "form-draft";
  }
  if (
    selectedSkill === "assessment-grade" &&
    pageType === "assessment-grade"
  ) {
    return "assessment-grade";
  }
  if (selectedSkill === "evaluation-draft" && pageType === "evaluation") {
    return "evaluation-draft";
  }
  if (selectedSkill === "archive-draft" && pageType === "archive") {
    return "archive-draft";
  }
  return "chat";
};
