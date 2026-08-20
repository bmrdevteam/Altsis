const SCHOOL_CALENDAR_AUTHS = ["owner", "admin", "manager"];

/**
 * 학교 캘린더(기본·사용자 정의) 추가/수정/삭제 가능 여부
 * @param {{ auth?: string } | null | undefined} user
 * @returns {boolean}
 */
export const canManageSchoolCalendar = (user) =>
  SCHOOL_CALENDAR_AUTHS.includes(user?.auth);

/**
 * 일정에 calendarId를 붙일 수 있는지.
 * 학교 캘린더: 학교 캘린더 관리자만. 개인 캘린더: 소유자만.
 *
 * @param {{ auth?: string, _id?: unknown } | null | undefined} user
 * @param {{ scope?: string, user?: unknown } | null | undefined} calendar
 * @returns {boolean}
 */
export const canAssignEventToCalendar = (user, calendar) => {
  if (!user || !calendar) return false;
  if (calendar.scope === "school") return canManageSchoolCalendar(user);
  return String(calendar.user) === String(user._id);
};

/**
 * 타인 일정 조회 시 비공개 사용자 캘린더에 속한 일정을 제외하는 조건.
 * 본인 조회이거나 비공개 캘린더가 없으면 null.
 *
 * @param {{ viewerId: string, targetUserId: string, privateCalendarIds?: unknown[] }} args
 * @returns {object | null}
 */
export const personalEventVisibilityFilter = ({
  viewerId,
  targetUserId,
  privateCalendarIds,
}) => {
  if (!viewerId || !targetUserId) return null;
  if (String(viewerId) === String(targetUserId)) return null;
  if (!privateCalendarIds?.length) return null;
  return {
    $or: [
      { calendarId: { $exists: false } },
      { calendarId: null },
      { calendarId: { $nin: privateCalendarIds } },
    ],
  };
};

/**
 * 사용자 캘린더 목록에서 개인 캘린더 조회 조건.
 * 타인 조회 시 isPrivate 캘린더는 제외한다.
 *
 * @param {{ viewerId: string, targetUserId: string }} args
 * @returns {{ user: string, scope: "personal", isPrivate?: { $ne: true } }}
 */
export const personalCalendarListFilter = ({ viewerId, targetUserId }) => {
  const filter = {
    user: targetUserId,
    scope: "personal",
  };
  if (String(viewerId) !== String(targetUserId)) {
    filter.isPrivate = { $ne: true };
  }
  return filter;
};
