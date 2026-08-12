/**
 * Calendar event notification helpers (pure / testable)
 * @namespace Services.CalendarEventNotify
 */

/**
 * 일정 시작 알림이 켜져 있는지 (필드 없으면 false)
 * @param {Object|null|undefined} event
 * @returns {boolean}
 */
export function isScheduleStartEnabled(event) {
  return event?.scheduleStart?.enabled === true;
}

/**
 * 학교 전체로 수신자를 확장할지
 * @param {Object|null|undefined} event
 * @returns {boolean}
 */
export function shouldExpandRecipientsToSchool(event) {
  return (
    event?.notifySchool === true &&
    event?.scope === "school" &&
    Boolean(event?.school)
  );
}

/**
 * 알림 설정으로 수신자 필터
 * @param {Array<{user: *, userId: string, userName?: string}>} toUserList
 * @param {Array<{user?: *, userId?: string, settings?: Object}>} settingDocs
 * @param {string} notificationType
 * @returns {Array}
 */
export function filterRecipientsBySettings(
  toUserList,
  settingDocs,
  notificationType
) {
  const byUserId = new Map();
  const byUserObjectId = new Map();

  for (const doc of settingDocs || []) {
    if (doc?.userId != null) {
      byUserId.set(String(doc.userId), doc.settings || {});
    }
    if (doc?.user != null) {
      byUserObjectId.set(String(doc.user), doc.settings || {});
    }
  }

  return (toUserList || []).filter((user) => {
    const settings =
      byUserObjectId.get(String(user.user)) ||
      byUserId.get(String(user.userId));
    // 설정이 없으면 기본값 true (알림 받음)
    if (!settings) return true;
    return settings[notificationType] !== false;
  });
}
