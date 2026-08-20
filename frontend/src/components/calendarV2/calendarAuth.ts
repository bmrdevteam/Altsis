const SCHOOL_CALENDAR_AUTHS = ["owner", "admin", "manager"] as const;

/**
 * 학교 캘린더(기본·사용자 정의) 추가/수정/삭제 가능 여부
 */
export const canManageSchoolCalendar = (user?: {
  auth?: string | null;
} | null): boolean =>
  !!user?.auth &&
  (SCHOOL_CALENDAR_AUTHS as readonly string[]).includes(user.auth);
