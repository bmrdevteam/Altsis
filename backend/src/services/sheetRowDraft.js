/**
 * 활동 양식 응답 초안(저장) 규칙.
 * 제출 파이프라인(필수·중복·결재·퀴즈)과 분리한다.
 */
import { getRequiredResponseCount, isFieldVisible } from "./altForms.js";
import {
  hasSubmittedCurrentOccurrence,
  isWeekdayScheduleEnabled,
} from "./weekdaySchedule.js";

/**
 * 저장 시 respondent 필드만 추출. 필수값 검사는 하지 않는다.
 * @param {Object} form
 * @param {Record<string, any>} bodyData
 */
export const collectRespondentFieldData = (form, bodyData = {}) => {
  const respondentFields = (form.fields || []).filter(
    (f) => f.permission === "respondent" && f.type !== "content"
  );
  const data = {};
  for (const field of respondentFields) {
    const fieldId = field._id.toString();
    if (!isFieldVisible(field, bodyData)) {
      data[fieldId] = null;
      continue;
    }
    if (fieldId in bodyData) {
      data[fieldId] = bodyData[fieldId];
    }
  }
  return { respondentFields, data };
};

/**
 * 새 초안을 만들 수 있는지. 기존 초안 갱신(updatingDraftId)은 횟수 제한 없음.
 * @returns {{ allowed: boolean, message?: string, existingDraft?: object }}
 */
export const checkDraftSaveLimit = (
  form,
  submittedRows = [],
  draftRows = [],
  { updatingDraftId } = {}
) => {
  if (updatingDraftId) {
    return { allowed: true };
  }

  if (form?.settings?.directInputMode) {
    return { allowed: false, message: "직접 입력 양식에는 저장할 수 없습니다." };
  }

  if (!form?.settings?.allowMultipleResponses) {
    if (submittedRows.length > 0) {
      return { allowed: false, message: "이미 응답하셨습니다." };
    }
    if (draftRows.length > 0) {
      return { allowed: true, existingDraft: draftRows[0] };
    }
    return { allowed: true };
  }

  const target = getRequiredResponseCount(form);
  if (
    target != null &&
    submittedRows.length + draftRows.length >= target
  ) {
    return {
      allowed: false,
      message: `목표 제출 횟수(${target}회)를 모두 채웠습니다.`,
    };
  }
  if (
    isWeekdayScheduleEnabled(form) &&
    hasSubmittedCurrentOccurrence(form, submittedRows)
  ) {
    return {
      allowed: false,
      message: "오늘 회차 제출을 이미 완료했습니다.",
    };
  }
  return { allowed: true };
};

/** 본인 초안은 응답 수정 설정과 무관하게 삭제 가능 */
export const canOwnerDeleteDraft = (row, userId) => {
  if (!row || !userId) return false;
  if (!row.isDraft) return false;
  const respondentId = row._respondent?._id || row._respondent;
  return !!respondentId && String(respondentId) === String(userId);
};

/** 초안 제출 승격 시 allowResubmit이 필요 없다 */
export const needsAllowResubmitToEdit = (row) => {
  if (!row) return true;
  return !row.isDraft;
};
