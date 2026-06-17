/**
 * AltForm Service namespace
 * @namespace Services.AltFormService
 */

/**
 * Alt Board에서 사용자의 역할 조회
 * @param {Object} board - Board 문서 (altBoardRole Map 포함)
 * @param {Object} user - 사용자 객체
 * @returns {string|null} "admin" | "writer" | "respondent" | null
 */
export const getAltBoardRole = (board, user) => {
  if (user.auth === "admin") return "admin";
  if (board.creator && board.creator.equals(user._id)) return "admin";

  if (board.altBoardRole) {
    const role = board.altBoardRole.get(user._id.toString());
    if (role) return role;
  }

  return null;
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
  if (form.creator && form.creator.equals(user._id)) return true;
  if (getAltBoardRole(board, user) === "admin") return true;
  if (user.auth === "manager") return true;
  return false;
};

/**
 * Form 응답 권한 확인 (respondent 이상 + 공개 기간 확인)
 * @param {Object} form - AltForm 문서
 * @param {Object} board - Board 문서
 * @param {Object} user - 사용자 객체
 * @returns {{ allowed: boolean, message?: string }}
 */
export const canRespondForm = (form, board, user) => {
  const role = getAltBoardRole(board, user);
  if (!role) {
    return { allowed: false, message: "보드 멤버가 아닙니다." };
  }

  const now = new Date();
  const allowLateSubmission = !!form.settings?.allowLateSubmission;
  if (form.settings?.openAt && now < new Date(form.settings.openAt)) {
    return { allowed: false, message: "양식이 아직 공개되지 않았습니다." };
  }
  if (
    form.settings?.closeAt &&
    now > new Date(form.settings.closeAt) &&
    !allowLateSubmission
  ) {
    return { allowed: false, message: "양식이 마감되었습니다." };
  }

  return { allowed: true };
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
