/**
 * AltForm Service namespace
 * @namespace Services.AltFormService
 */

import {
  getOccurrenceWindow,
  getOpenOccurrences,
  hasSubmittedCurrentOccurrence,
  isInOccurrenceWindow,
  isWeekdayScheduleEnabled,
  isWithinFormPeriod,
  normalizeWeekdayScheduleInput,
  shouldShowUnsubmittedTodo as shouldShowUnsubmittedTodoCore,
  getEffectiveTodoCloseAt,
  estimateWeekdayOccurrenceCount,
  resolveOccurrenceKey,
  listOccurrences,
  hasSubmittedOccurrence,
} from "./weekdaySchedule.js";

export {
  isWeekdayScheduleEnabled,
  getOccurrenceWindow,
  getOpenOccurrences,
  isInOccurrenceWindow,
  hasSubmittedCurrentOccurrence,
  hasSubmittedOccurrence,
  isWithinFormPeriod,
  getEffectiveTodoCloseAt,
  estimateWeekdayOccurrenceCount,
  normalizeWeekdayScheduleInput,
  resolveOccurrenceKey,
  listOccurrences,
};

/**
 * altBoardRole Map/plain object에서 역할 조회
 * @param {Map|Object|undefined|null} altBoardRole
 * @param {string} userOid
 * @returns {string|null}
 */
const lookupAltBoardRole = (altBoardRole, userOid) => {
  if (!altBoardRole || !userOid) return null;
  if (altBoardRole instanceof Map) {
    return altBoardRole.get(userOid) || null;
  }
  if (typeof altBoardRole.get === "function") {
    return altBoardRole.get(userOid) || null;
  }
  return altBoardRole[userOid] || null;
};

/**
 * Alt Board에서 사용자의 역할 조회
 * @param {Object} board - Board 문서 (altBoardRole Map 포함)
 * @param {Object} user - 사용자 객체
 * @returns {string|null} "admin" | "writer" | "respondent" | null
 */
export const getAltBoardRole = (board, user) => {
  if (user.auth === "admin") return "admin";
  if (board.creator && board.creator.equals(user._id)) return "admin";

  return lookupAltBoardRole(board.altBoardRole, user._id.toString());
};

/**
 * 목록용 unreadResponseCount 해석.
 * lastOpenedAt이 없는 양식은 0 (기준 미설정).
 *
 * @param {string} formId
 * @param {Map<string, Date>} openedAtByForm - formId → lastOpenedAt
 * @param {Map<string, number>} unreadAggByForm - formId → 집계 count
 * @returns {number}
 */
export const resolveUnreadResponseCount = (
  formId,
  openedAtByForm,
  unreadAggByForm
) => {
  if (!openedAtByForm?.has(formId)) return 0;
  return unreadAggByForm?.get(formId) || 0;
};

/**
 * Form 관리 권한 확인 (admin 또는 writer) — 양식 생성 등에 사용
 * @param {Object} board - Board 문서
 * @param {Object} user - 사용자 객체
 * @returns {boolean}
 */
export const canManageForm = (board, user) => {
  const role = getAltBoardRole(board, user);
  return role === "admin" || role === "writer";
};

/**
 * Form 수정/삭제 권한 확인 (양식 작성자, 보드 admin, 시스템 manager)
 * @param {Object} form - AltForm 문서 (creator 필드 포함)
 * @param {Object} board - Board 문서
 * @param {Object} user - 사용자 객체
 * @returns {boolean}
 */
export const canModifyForm = (form, board, user) => {
  // 비공개는 작성자만 수정
  if (form.isDraft) {
    return !!(form.creator && form.creator.equals(user._id));
  }
  if (form.creator && form.creator.equals(user._id)) return true;
  if (getAltBoardRole(board, user) === "admin") return true;
  if (user.auth === "manager") return true;
  return false;
};

const idsEqual = (a, b) => {
  if (a == null || b == null) return false;
  if (typeof a.equals === "function") return a.equals(b);
  return String(a) === String(b);
};

/**
 * groups 또는 users가 있으면 보드 상속이 아니라 이 양식만 지정.
 * @param {Object|undefined|null} access
 * @returns {boolean}
 */
export const isAccessListCustom = (access) => {
  if (!access) return false;
  const g = access.groups || {};
  const users = access.users || [];
  return !!(g.manager || g.teacher || g.student || users.length > 0);
};

/** 저장용. 커스텀이 아니면 undefined (보드 inherit) */
export const normalizeFormAccess = (access) => {
  if (!isAccessListCustom(access)) return undefined;
  return {
    groups: {
      manager: !!access.groups?.manager,
      teacher: !!access.groups?.teacher,
      student: !!access.groups?.student,
    },
    users: (access.users || [])
      .filter((u) => u && (u.user || u.userId))
      .map((u) => ({
        user: u.user,
        userId: u.userId,
        userName: u.userName,
      })),
  };
};

/**
 * @param {Object} access
 * @param {Object} user
 * @param {string|null} [schoolRole] teacher|student|manager
 * @returns {boolean}
 */
export const userMatchesAccessList = (access, user, schoolRole) => {
  if (!access || !user) return false;
  const users = access.users || [];
  const uid = user._id != null ? String(user._id) : "";
  if (
    users.some(
      (u) => String(u.user) === uid || (user.userId && u.userId === user.userId)
    )
  ) {
    return true;
  }
  const g = access.groups || {};
  if (g.manager && (user.auth === "manager" || schoolRole === "manager")) {
    return true;
  }
  if (schoolRole && g[schoolRole]) return true;
  return false;
};

/** 보드 admin · 시스템 manager · 양식 작성자 */
export const isFormStaff = (form, board, user) => {
  if (!user) return false;
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (form?.creator && idsEqual(form.creator, user._id)) return true;
  if (getAltBoardRole(board, user) === "admin") return true;
  return false;
};

/**
 * 양식 접근(목록·열람). staff·작성 권한·멤버.
 * 제출·할 일은 {@link isFormRespondent}.
 * @param {string|null} [schoolRole]
 */
export const isFormMember = (form, board, user, schoolRole = null) => {
  if (isFormStaff(form, board, user)) return true;
  if (!getAltBoardRole(board, user)) return false;
  if (canViewAllRows(form, board, user, schoolRole)) return true;
  if (!isAccessListCustom(form?.members)) return true;
  return userMatchesAccessList(form.members, user, schoolRole);
};

/**
 * 제출·할 일·미제출 대상. staff·작성 권한 우회 없음.
 * 멤버 미지정이면 보드 역할이 있는 사람.
 * @param {string|null} [schoolRole]
 */
export const isFormRespondent = (form, board, user, schoolRole = null) => {
  if (!user || !getAltBoardRole(board, user)) return false;
  if (!isAccessListCustom(form?.members)) return true;
  return userMatchesAccessList(form.members, user, schoolRole);
};

/**
 * 기록 전체 보기·시트 관리. 미지정이면 보드 admin/writer.
 * @param {string|null} [schoolRole]
 */
export const canViewAllRows = (form, board, user, schoolRole = null) => {
  if (isFormStaff(form, board, user)) return true;
  if (!getAltBoardRole(board, user)) return false;
  if (!isAccessListCustom(form?.writers)) {
    return canManageForm(board, user);
  }
  return userMatchesAccessList(form.writers, user, schoolRole);
};

/** getVisibleFields용 역할: 기록 전체면 writer, 멤버면 respondent */
export const getFormViewerRole = (form, board, user, schoolRole = null) => {
  if (canViewAllRows(form, board, user, schoolRole)) {
    const boardRole = getAltBoardRole(board, user);
    return boardRole === "admin" ? "admin" : "writer";
  }
  if (isFormMember(form, board, user, schoolRole)) return "respondent";
  return getAltBoardRole(board, user);
};

/**
 * 캘린더·제출 현황용 양식 멤버 목록. inherit이면 보드 멤버.
 * @returns {Promise<Array<{user, userId, userName}>>}
 */
export const resolveFormMemberUsers = async (academyId, form, board) => {
  const { getBoardMembers } = await import("./boards.js");
  const { Registration } = await import("../models/index.js");
  const boardMembers = await getBoardMembers(academyId, board);
  if (!isAccessListCustom(form?.members) && !isAccessListCustom(form?.writers)) {
    return boardMembers;
  }

  const regs = await Registration(academyId)
    .find({
      school: board.school,
      isActivated: true,
      user: { $in: boardMembers.map((m) => m.user) },
    })
    .select("user role")
    .lean();
  const roleByUser = new Map(
    regs.map((r) => [String(r.user), r.role || null])
  );

  return boardMembers.filter((m) => {
    const fakeUser = {
      _id: m.user,
      userId: m.userId,
      auth: "member",
    };
    return isFormRespondent(
      form,
      board,
      fakeUser,
      roleByUser.get(String(m.user)) || null
    );
  });
};

/**
 * 필수 모드 여부 (미제출 표시 대상).
 * true일 때만 필수. 미설정·false는 선택.
 * @param {Object} form
 * @returns {boolean}
 */
export const isFormRequiredMode = (form) =>
  form?.settings?.requiredMode === true;

/**
 * 필수+복수일 때 목표 제출 횟수. 해당이 아니면 null.
 * @param {Object} form
 * @returns {number|null}
 */
export const getRequiredResponseCount = (form) => {
  if (!isFormRequiredMode(form)) return null;
  if (!form?.settings?.allowMultipleResponses) return null;
  const n = Number(form.settings.requiredResponseCount);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
};

/**
 * 필수+복수 목표 횟수에 도달하면 추가 제출 불가.
 * @param {Object} form
 * @param {Array} myRows
 * @returns {{ allowed: boolean, message?: string }}
 */
export const checkMultipleResponseLimit = (
  form,
  myRows = [],
  now = new Date(),
  occurrenceKey = null
) => {
  if (!form?.settings?.allowMultipleResponses) {
    return { allowed: true };
  }
  const target = getRequiredResponseCount(form);
  if (target == null) {
    return { allowed: true };
  }
  if (myRows.length >= target) {
    return {
      allowed: false,
      message: `목표 제출 횟수(${target}회)를 모두 채웠습니다.`,
    };
  }
  if (isWeekdayScheduleEnabled(form)) {
    const resolved = resolveOccurrenceKey(form, now, occurrenceKey, myRows);
    if (resolved.error) {
      return { allowed: false, message: resolved.error };
    }
  }
  return { allowed: true };
};

/**
 * 목록용 mySubmitted.
 * - 단수: 행이 있으면 제출완료
 * - 복수(선택): 한 번이라도 내면 제출완료로 보지 않음 → 미제출 뱃지 안 씀(필수 아님)
 *   다만 mySubmitted는 "한 번이라도 냄"으로 두어 본인 응답 확인 등에 사용
 * - 필수+복수+목표 N: 내 제출 수 >= N 이면 제출완료
 * @param {Object} form
 * @param {Array} myRows
 * @returns {boolean}
 */
export const hasSubmittedForList = (form, myRows = []) => {
  if (!myRows.length) return false;
  const target = getRequiredResponseCount(form);
  if (target != null) {
    return myRows.length >= target;
  }
  // 복수·비필수: 한 번 내도 "제출완료" 뱃지용으로는 true (선택 뱃지 분기에서 가림)
  // 단수: 행 있으면 true
  return true;
};

/**
 * 할 일(미제출) 카드 노출 여부
 */
export const shouldShowUnsubmittedTodo = (form, myRows = [], now = new Date()) =>
  shouldShowUnsubmittedTodoCore(form, myRows, now, {
    isFormRequiredMode,
    hasSubmittedForList,
  });

/**
 * Form 응답 권한 확인 (respondent 이상 + 공개 기간 확인)
 * @param {Object} form - AltForm 문서
 * @param {Object} board - Board 문서
 * @param {Object} user - 사용자 객체
 * @returns {{ allowed: boolean, message?: string }}
 */
export const canRespondForm = (form, board, user, now = new Date(), schoolRole = null) => {
  if (!isFormRespondent(form, board, user, schoolRole)) {
    return { allowed: false, message: "이 양식의 멤버가 아닙니다." };
  }

  if (form.isDraft) {
    return { allowed: false, message: "비공개 양식입니다." };
  }

  if (form.settings?.openAt && now < new Date(form.settings.openAt)) {
    return { allowed: false, message: "양식이 아직 공개되지 않았습니다." };
  }
  if (form.settings?.closeAt && now > new Date(form.settings.closeAt)) {
    return { allowed: false, message: "양식이 마감되었습니다." };
  }

  if (isWeekdayScheduleEnabled(form)) {
    if (getOpenOccurrences(form, now).length === 0) {
      return { allowed: false, message: "지금은 제출 기간이 아닙니다." };
    }
  }

  return { allowed: true };
};

/**
 * settings.weekdaySchedule 정규화. 오류 시 { error: string }
 * @param {Object} settings - mutate in place
 * @returns {{ error?: string }}
 */
export const applyWeekdayScheduleNormalize = (settings) => {
  if (!settings) return {};
  try {
    const normalized = normalizeWeekdayScheduleInput(
      settings.weekdaySchedule,
      {
        requiredMode: settings.requiredMode === true,
        allowMultipleResponses: !!settings.allowMultipleResponses,
        openAt: settings.openAt,
        closeAt: settings.closeAt,
      }
    );
    if (!normalized.enabled) {
      settings.weekdaySchedule = undefined;
    } else {
      settings.weekdaySchedule = normalized;
    }
    return {};
  } catch (err) {
    return { error: err.message || "요일마다 설정이 올바르지 않습니다." };
  }
};

/**
 * 역할에 따라 보이는 필드 필터링
 * @param {Array} fields - AltForm.fields
 * @param {string} role - "admin" | "writer" | "respondent"
 * @returns {Array} 필터링된 필드 목록
 */
export const getVisibleFields = (fields, role) => {
  if (role === "admin" || role === "writer") {
    return fields;
  }

  // respondent: respondent 필드 + visibleToRespondent=true인 owner 필드
  return fields.filter(
    (f) => f.permission === "respondent" || f.visibleToRespondent === true
  );
};

/**
 * 조건부 필드 표시 - 조건 평가
 * @param {Object} condition - { fieldId, operator, value }
 * @param {Object} data - 현재 응답 데이터 (fieldId → value)
 * @returns {boolean}
 */
const getSystemVariableValue = (varId) => {
  const now = new Date();
  switch (varId) {
    case "_system_date":
      return now.toISOString().slice(0, 10);
    case "_system_time": {
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
    case "_system_day":
      return ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
    default:
      return "";
  }
};

export const evaluateCondition = (condition, data) => {
  const fieldId = condition.fieldId?.toString();
  const fieldValue = fieldId?.startsWith("_system_")
    ? getSystemVariableValue(fieldId)
    : data[fieldId];

  switch (condition.operator) {
    case "equals":
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return String(fieldValue ?? "") === String(condition.value ?? "");
    case "notEquals":
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(condition.value);
      }
      return String(fieldValue ?? "") !== String(condition.value ?? "");
    case "contains":
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return String(fieldValue ?? "").includes(String(condition.value ?? ""));
    case "before":
      return String(fieldValue ?? "") < String(condition.value ?? "");
    case "after":
      return String(fieldValue ?? "") > String(condition.value ?? "");
    case "isEmpty":
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "isNotEmpty":
      return !(
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return true;
  }
};

/**
 * 필드의 표시 조건을 평가하여 필드가 보이는지 판단
 * @param {Object} field - AltForm field (displayCondition 포함)
 * @param {Object} data - 현재 응답 데이터
 * @returns {boolean} true면 필드 표시
 */
export const isFieldVisible = (field, data) => {
  if (!field.displayCondition?.enabled) return true;
  if (
    !field.displayCondition.conditions ||
    field.displayCondition.conditions.length === 0
  )
    return true;

  const results = field.displayCondition.conditions.map((c) =>
    evaluateCondition(c, data)
  );

  if (field.displayCondition.logic === "or") {
    return results.some((r) => r);
  }
  return results.every((r) => r); // "and" (default)
};

/**
 * 퀴즈 자동 채점
 * @param {Object} form - AltForm 문서
 * @param {Object} data - 응답 데이터 (fieldId → value)
 * @returns {{ score: number, total: number, fieldResults: Object }}
 */
export const gradeQuizRow = (form, data) => {
  let score = 0;
  let total = 0;
  const fieldResults = {};

  const gradableTypes = ["select", "radio", "checkbox", "number", "multiSelect"];

  for (const field of form.fields) {
    if (field.permission !== "respondent") continue;
    if (field.correctAnswer === undefined || field.correctAnswer === null)
      continue;
    if (field.points === undefined || field.points === 0) continue;

    total += field.points;
    const fieldId = field._id.toString();
    const answer = data[fieldId];

    let isCorrect = false;

    if (gradableTypes.includes(field.type)) {
      if (
        field.type === "checkbox" ||
        field.type === "multiSelect"
      ) {
        // 배열 비교 (순서 무관)
        const a = Array.isArray(answer) ? [...answer].sort() : [];
        const c = Array.isArray(field.correctAnswer)
          ? [...field.correctAnswer].sort()
          : [field.correctAnswer];
        isCorrect = JSON.stringify(a) === JSON.stringify(c);
      } else if (field.type === "number") {
        isCorrect =
          Number(answer) === Number(field.correctAnswer);
      } else {
        // select, radio: 문자열 비교
        isCorrect = String(answer ?? "") === String(field.correctAnswer);
      }
    }
    // text, textarea, file 등은 자동 채점 불가 — isCorrect = false

    if (isCorrect) {
      score += field.points;
    }
    fieldResults[fieldId] = isCorrect;
  }

  return { score, total, fieldResults };
};

/**
 * 퀴즈/평가 모드 동시 ON 불가
 * @param {Object} settings
 * @returns {string|null} 오류 메시지 또는 null
 */
export const validateExclusiveFormModes = (settings) => {
  if (settings?.quizMode && settings?.assessmentMode) {
    return "퀴즈 모드와 평가 모드는 동시에 사용할 수 없습니다.";
  }
  return null;
};

/**
 * completion(자기선언) 값이 충족인지
 * @param {*} value
 * @returns {boolean}
 */
export const isCompletionTruthy = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (!t || t === "false" || t === "0") return false;
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
};

const fieldIdOf = (field) =>
  field?._id?.toString ? field._id.toString() : String(field?._id || "");

const rubricMaxPoints = (rubric) => {
  if (!rubric?.levels?.length) return 0;
  return Math.max(
    0,
    ...rubric.levels.map((l) =>
      l.points != null && Number.isFinite(Number(l.points))
        ? Number(l.points)
        : 0
    )
  );
};

/**
 * 필드에 연결된 루브릭 id 목록 (rubricIds 우선, 없으면 rubricId)
 * @param {Object} field
 * @returns {string[]}
 */
export const getFieldRubricIds = (field) => {
  if (Array.isArray(field?.rubricIds) && field.rubricIds.length > 0) {
    return field.rubricIds.map(String).filter(Boolean);
  }
  if (field?.rubricId) return [String(field.rubricId)];
  return [];
};

/**
 * byRubric / 레거시 levelId 로부터 필드 점수·max 집계
 * @param {Object} grade
 * @param {string[]} rubricIds
 * @param {Array} rubrics
 * @returns {{ score: number, max: number, byRubric: Object, levelId?: string, levelLabel?: string }}
 */
const aggregateFieldRubricGrade = (grade, rubricIds, rubrics) => {
  let byRubric = { ...(grade?.byRubric || {}) };

  // 레거시: byRubric 없이 levelId만 있는 경우 첫 루브릭으로 승격
  if (
    rubricIds.length > 0 &&
    grade?.levelId &&
    !byRubric[rubricIds[0]]?.levelId
  ) {
    const rid = rubricIds[0];
    const rubric = rubrics.find((r) => r.id === rid);
    const level = rubric?.levels?.find((l) => l.id === grade.levelId);
    byRubric[rid] = {
      ...(byRubric[rid] || {}),
      levelId: grade.levelId,
      levelLabel: grade.levelLabel || level?.label,
      score:
        grade.score != null
          ? grade.score
          : level?.points != null
            ? Number(level.points)
            : undefined,
      max: byRubric[rid]?.max ?? rubricMaxPoints(rubric),
      comment: byRubric[rid]?.comment,
    };
  }

  let score = 0;
  let max = 0;
  let hasScore = false;
  for (const rid of rubricIds) {
    const rubric = rubrics.find((r) => r.id === rid);
    const entryMax = byRubric[rid]?.max ?? rubricMaxPoints(rubric);
    max += entryMax;
    if (typeof byRubric[rid]?.score === "number" && Number.isFinite(byRubric[rid].score)) {
      score += byRubric[rid].score;
      hasScore = true;
    }
  }

  const result = {
    byRubric,
    max,
    score: hasScore ? score : undefined,
  };
  if (rubricIds.length === 1 && byRubric[rubricIds[0]]) {
    result.levelId = byRubric[rubricIds[0]].levelId;
    result.levelLabel = byRubric[rubricIds[0]].levelLabel;
  }
  return result;
};

/**
 * 평가 모드 총점·최종 필드 재계산 (status/확정 메타는 유지)
 * @param {Object} form
 * @param {Object} assessment
 * @returns {Object} assessment
 */
export const recomputeAssessmentTotals = (form, assessment) => {
  const byField = { ...(assessment?.byField || {}) };
  const prevFinal = assessment?.final || {};

  let score = 0;
  let max = 0;
  const rubrics = form.rubrics || [];

  for (const field of form.fields || []) {
    const method = field.gradingMethod;
    if (!method || method === "none") continue;
    const fid = fieldIdOf(field);
    const g = byField[fid];
    if (!g) continue;

    if (method === "rubric") {
      const rubricIds = getFieldRubricIds(field);
      const agg = aggregateFieldRubricGrade(g, rubricIds, rubrics);
      byField[fid] = {
        ...g,
        source: "rubric",
        byRubric: agg.byRubric,
        max: agg.max,
        score: agg.score,
        levelId: agg.levelId,
        levelLabel: agg.levelLabel,
      };
      if (typeof agg.score === "number") score += agg.score;
      max += agg.max;
      continue;
    }

    if (typeof g.score === "number" && Number.isFinite(g.score)) {
      score += g.score;
    }

    if (typeof g.max === "number" && Number.isFinite(g.max)) {
      max += g.max;
    } else if (method === "completion" || method === "manual_score") {
      max += Number(field.points) || 0;
    }
  }

  const final = {
    status: prevFinal.status === "finalized" ? "finalized" : "draft",
    score,
    max,
  };

  if (prevFinal.finalizedBy) final.finalizedBy = prevFinal.finalizedBy;
  if (prevFinal.finalizedAt) final.finalizedAt = prevFinal.finalizedAt;
  if (prevFinal.comment != null) final.comment = prevFinal.comment;

  return { byField, final };
};

/**
 * 제출/재제출 시 completion 초안 점수 반영.
 * manual/rubric 기존 채점은 유지. final은 draft로 강등.
 * @param {Object} form
 * @param {Object} rowData - 응답 필드 값
 * @param {Object|null} previousAssessment
 * @returns {Object} _assessment
 */
export const applyAssessmentOnSubmit = (form, rowData, previousAssessment) => {
  const prevByField = { ...(previousAssessment?.byField || {}) };
  const byField = {};
  const rubrics = form.rubrics || [];

  for (const field of form.fields || []) {
    const method = field.gradingMethod || "none";
    if (method === "none") continue;
    const fid = fieldIdOf(field);
    const prev = prevByField[fid];

    if (method === "completion") {
      const points = Number(field.points) || 0;
      const done = isCompletionTruthy(rowData?.[fid]);
      byField[fid] = {
        score: done ? points : 0,
        max: points,
        source: "completion",
      };
    } else if (method === "manual_score") {
      const points = Number(field.points) || 0;
      byField[fid] = {
        ...(prev?.source === "manual" ? prev : {}),
        max: points,
        source: "manual",
      };
      if (byField[fid].score == null) {
        // 슬롯만 확보
      }
    } else if (method === "rubric") {
      const rubricIds = getFieldRubricIds(field);
      const prevRubric = prev?.source === "rubric" ? prev : {};
      const byRubric = { ...(prevRubric.byRubric || {}) };
      for (const rid of rubricIds) {
        if (!byRubric[rid]) byRubric[rid] = {};
        const rubric = rubrics.find((r) => r.id === rid);
        byRubric[rid].max = rubricMaxPoints(rubric);
      }
      // 연결 해제된 루브릭 슬롯은 유지하되 max만 연결된 것으로 집계
      byField[fid] = {
        ...prevRubric,
        source: "rubric",
        byRubric,
      };
    }
  }

  const assessment = {
    byField,
    final: {
      status: "draft",
      // 재제출 시 이전 최종 코멘트는 초안으로 유지(재확정 필요)
      comment: previousAssessment?.final?.comment,
    },
  };

  return recomputeAssessmentTotals(form, assessment);
};

/**
 * 비관리자용 _assessment 마스킹 (확정 전 결과 숨김)
 * @param {Object|undefined} assessment
 * @param {boolean} canSeeFull - 관리자/작성자
 * @returns {Object|undefined}
 */
export const filterAssessmentForViewer = (assessment, canSeeFull) => {
  if (!assessment) return undefined;
  if (canSeeFull) return assessment;
  if (assessment.final?.status === "finalized") return assessment;
  return { final: { status: assessment.final?.status || "draft" } };
};

/**
 * Fields exposed with a row. Non-managers receive their visible form fields plus
 * workflow fields required to understand approval/circulation state.
 */
export const getVisibleRowFields = (
  form,
  role = "respondent",
  canSeeFull = false
) => {
  const fields = Array.isArray(form?.fields) ? form.fields : [];
  if (canSeeFull) return fields;
  const visibleIds = new Set(
    getVisibleFields(fields, role).map((field) => String(field._id))
  );
  for (const field of fields) {
    if (field.type === "approval" || field.type === "circulation") {
      visibleIds.add(String(field._id));
    }
  }
  return fields.filter((field) => visibleIds.has(String(field._id)));
};

/**
 * Remove owner-only and unrevealed quiz/assessment values before returning a row.
 */
export const filterSheetRowDataForViewer = (
  form,
  data,
  { role = "respondent", canSeeFull = false, now = new Date() } = {}
) => {
  const source =
    data instanceof Map ? Object.fromEntries(data.entries()) : { ...(data || {}) };
  if (canSeeFull) return source;

  const visibleFieldIds = new Set(
    getVisibleRowFields(form, role, false).map((field) => String(field._id))
  );
  const isQuiz = form?.settings?.quizMode;
  const isAssessment = form?.settings?.assessmentMode;
  const isClosed =
    form?.settings?.closeAt && new Date(form.settings.closeAt) < now;
  const scoreVisible =
    isQuiz &&
    (form.settings?.quizSettings?.scoreReveal === "immediately" ||
      (form.settings?.quizSettings?.scoreReveal === "afterDeadline" &&
        isClosed));
  const answerVisible =
    isQuiz &&
    (form.settings?.quizSettings?.answerReveal === "immediately" ||
      (form.settings?.quizSettings?.answerReveal === "afterDeadline" &&
        isClosed));

  const filtered = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith("_quiz_")) {
      if (
        (key === "_quiz_score" || key === "_quiz_total") &&
        scoreVisible
      ) {
        filtered[key] = value;
      } else if (key === "_quiz_fieldResults" && answerVisible) {
        filtered[key] = value;
      }
      continue;
    }
    if (key === "_assessment") {
      if (isAssessment) {
        const masked = filterAssessmentForViewer(value, false);
        if (masked) filtered[key] = masked;
      }
      continue;
    }
    if (visibleFieldIds.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
};

/**
 * 채점 패널에서 byField / final 부분 갱신 후 재계산
 * @param {Object} form
 * @param {Object} currentAssessment
 * @param {Object} patch - { byField?, final? }
 * @param {{ user, userId, userName }} grader
 * @returns {Object}
 */
export const applyAssessmentGradePatch = (
  form,
  currentAssessment,
  patch,
  grader
) => {
  const byField = { ...(currentAssessment?.byField || {}) };
  const now = new Date().toISOString();
  const rubrics = form.rubrics || [];

  if (patch?.byField && typeof patch.byField === "object") {
    for (const [fid, update] of Object.entries(patch.byField)) {
      if (!update || typeof update !== "object") continue;
      const field = (form.fields || []).find((f) => fieldIdOf(f) === fid);
      if (!field) continue;
      const method = field.gradingMethod;
      if (method !== "manual_score" && method !== "rubric" && method !== "completion") {
        continue;
      }

      const next = { ...(byField[fid] || {}) };
      if (update.comment !== undefined) next.comment = update.comment;

      if (method === "manual_score" || method === "completion") {
        const max = Number(field.points) || 0;
        next.max = max;
        next.source = method === "completion" ? "completion" : "manual";
        if (update.score !== undefined && update.score !== null) {
          const s = Number(update.score);
          next.score = Number.isFinite(s)
            ? Math.max(0, Math.min(max, s))
            : 0;
        }
      }

      if (method === "rubric") {
        next.source = "rubric";
        const rubricIds = getFieldRubricIds(field);
        let byRubric = { ...(next.byRubric || {}) };

        // 레거시: 단일 levelId → 첫 루브릭
        if (update.levelId && rubricIds.length >= 1 && !update.byRubric) {
          const rid = rubricIds[0];
          byRubric[rid] = {
            ...(byRubric[rid] || {}),
            levelId: update.levelId || undefined,
          };
        }

        if (update.byRubric && typeof update.byRubric === "object") {
          for (const [rid, u] of Object.entries(update.byRubric)) {
            if (!rubricIds.includes(rid) || !u || typeof u !== "object") continue;
            const entry = { ...(byRubric[rid] || {}) };
            if (u.comment !== undefined) entry.comment = u.comment;
            if (u.levelId !== undefined) {
              entry.levelId = u.levelId || undefined;
              if (!u.levelId) {
                delete entry.levelLabel;
                delete entry.score;
              }
            }
            byRubric[rid] = entry;
          }
        }

        // 수준 → 점수/라벨 반영
        for (const rid of rubricIds) {
          const rubric = rubrics.find((r) => r.id === rid);
          const entry = { ...(byRubric[rid] || {}) };
          entry.max = rubricMaxPoints(rubric);
          if (entry.levelId && rubric) {
            const level = rubric.levels?.find((l) => l.id === entry.levelId);
            if (level) {
              entry.levelLabel = level.label;
              if (level.points != null && Number.isFinite(Number(level.points))) {
                entry.score = Number(level.points);
              }
            }
          }
          byRubric[rid] = entry;
        }

        const agg = aggregateFieldRubricGrade(
          { ...next, byRubric },
          rubricIds,
          rubrics
        );
        next.byRubric = agg.byRubric;
        next.max = agg.max;
        next.score = agg.score;
        next.levelId = agg.levelId;
        next.levelLabel = agg.levelLabel;
      }

      if (grader) {
        next.gradedBy = {
          user: grader.user,
          userId: grader.userId,
          userName: grader.userName,
        };
        next.gradedAt = now;
      }
      byField[fid] = next;
    }
  }

  const final = { ...(currentAssessment?.final || {}), status: "draft" };
  delete final.finalizedBy;
  delete final.finalizedAt;

  if (patch?.final && typeof patch.final === "object") {
    if (patch.final.comment !== undefined) final.comment = patch.final.comment;
    // 최종 루브릭(levelId)은 사용하지 않음 — 항목별 루브릭만 사용
  }

  // 패치로 채점하면 확정 해제(재확정 필요) — status draft 유지
  return recomputeAssessmentTotals(form, { byField, final });
};

/**
 * 평가 확정
 * @param {Object} form
 * @param {Object} assessment
 * @param {{ user, userId, userName }} finalizer
 * @returns {{ ok: boolean, message?: string, assessment?: Object }}
 */
export const finalizeAssessment = (form, assessment, finalizer) => {
  const recomputed = recomputeAssessmentTotals(form, assessment || {});
  const final = { ...recomputed.final, status: "finalized" };

  if (finalizer) {
    final.finalizedBy = {
      user: finalizer.user,
      userId: finalizer.userId,
      userName: finalizer.userName,
    };
    final.finalizedAt = new Date().toISOString();
  }

  return { ok: true, assessment: { byField: recomputed.byField, final } };
};

/**
 * 평가 확정 취소 → draft
 * @param {Object} assessment
 * @returns {Object}
 */
export const unfinalizeAssessment = (assessment) => {
  const final = { ...(assessment?.final || {}), status: "draft" };
  delete final.finalizedBy;
  delete final.finalizedAt;
  return {
    byField: { ...(assessment?.byField || {}) },
    final,
  };
};

/**
 * 중복 검사 필드 목록 추출
 * @param {Object} form - AltForm 문서
 * @returns {Array} duplicateCheck.enabled인 필드 목록
 */
export const getDuplicateCheckFields = (form) => {
  return form.fields.filter((f) => f.duplicateCheck?.enabled);
};

/**
 * 중복 검사 카운터 키 생성
 *
 * dupCheck 필드들의 값 조합을 직렬화하여 카운터 키 배열을 반환한다.
 * - 단일 값 필드: 1개 키
 * - multiDate 필드: 날짜 수만큼 키
 * - 배열(multiSelect) 필드: 개별 요소별 키 (Cartesian product)
 *
 * @param {Array} dupFields - duplicateCheck.enabled인 필드 목록
 * @param {Function} getDupValue - (fieldId) => 해당 필드의 제출 값
 * @param {Object|null} multiDateDupField - multiDate 타입인 dupField (없으면 null)
 * @returns {string[]} 카운터 키 배열
 */
export const buildDupCounterKeys = (dupFields, getDupValue, multiDateDupField) => {
  const mdId = multiDateDupField?._id?.toString();

  // 1. base 필드 (multiDate 제외) 값 수집
  const baseEntries = [];
  for (const df of dupFields) {
    const fieldId = df._id.toString();
    if (mdId && fieldId === mdId) continue;
    const val = getDupValue(fieldId);
    baseEntries.push({ fieldId, value: val });
  }

  // 2. base 필드의 Cartesian product 생성 (배열 값 확장)
  const expandEntries = (entries) => {
    if (entries.length === 0) return [{}];
    const [first, ...rest] = entries;
    const restVariants = expandEntries(rest);
    const values = Array.isArray(first.value) ? first.value : [first.value];
    const result = [];
    for (const v of values) {
      for (const rv of restVariants) {
        result.push({ [first.fieldId]: v, ...rv });
      }
    }
    return result;
  };

  const baseVariants = expandEntries(baseEntries);

  // 3. multiDate 필드가 있으면 각 날짜별로 키 생성
  if (multiDateDupField) {
    const rawDates = getDupValue(mdId);
    const dates = Array.isArray(rawDates) ? rawDates : [rawDates];
    const keys = [];
    for (const base of baseVariants) {
      for (const date of dates) {
        if (!date) continue;
        keys.push(JSON.stringify({ ...base, [mdId]: date }));
      }
    }
    return keys;
  }

  // 4. multiDate 없으면 base 조합만
  return baseVariants.map((base) => JSON.stringify(base));
};
