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
  if (user.auth === "admin" || user.auth === "manager") return "admin";
  if (board.creator && board.creator.equals(user._id)) return "admin";

  if (board.altBoardRole) {
    const role = board.altBoardRole.get(user._id.toString());
    if (role) return role;
  }

  return null;
};

/**
 * Form 관리 권한 확인 (admin 또는 writer)
 * @param {Object} board - Board 문서
 * @param {Object} user - 사용자 객체
 * @returns {boolean}
 */
export const canManageForm = (board, user) => {
  const role = getAltBoardRole(board, user);
  return role === "admin" || role === "writer";
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
  if (form.settings?.openAt && now < new Date(form.settings.openAt)) {
    return { allowed: false, message: "양식이 아직 공개되지 않았습니다." };
  }
  if (form.settings?.closeAt && now > new Date(form.settings.closeAt)) {
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
