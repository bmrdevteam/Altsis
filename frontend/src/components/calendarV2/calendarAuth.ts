import { isSchoolManager, TSchoolManagerUser } from "utils/schoolManager";

/**
 * 학교 캘린더(기본·사용자 정의) 추가/수정/삭제 가능 여부
 */
export const canManageSchoolCalendar = (
  user?: TSchoolManagerUser,
  schoolId?: unknown
): boolean => isSchoolManager(user, schoolId);
