/**
 * AltForm 「요일마다」 회차 창 헬퍼 (Asia/Seoul)
 */

export const WEEKDAY_SCHEDULE_TZ = "Asia/Seoul";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * @param {string} timeStr
 * @returns {{ hours: number, minutes: number }|null}
 */
export const parseHhMm = (timeStr) => {
  if (typeof timeStr !== "string") return null;
  const m = TIME_RE.exec(timeStr.trim());
  if (!m) return null;
  return { hours: Number(m[1]), minutes: Number(m[2]) };
};

/**
 * @param {Date} date
 * @returns {{ year: number, month: number, day: number, dayOfWeek: number, hour: number, minute: number }}
 */
export const getZonedParts = (date, timeZone = WEEKDAY_SCHEDULE_TZ) => {
  const d = date instanceof Date ? date : new Date(date);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value])
  );
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dayOfWeek: weekdayMap[parts.weekday],
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

/**
 * KST 벽시계 → UTC Date (해당 로컬 시각의 절대 시점)
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @param {number} hours
 * @param {number} minutes
 * @returns {Date}
 */
export const zonedLocalToUtc = (
  year,
  month,
  day,
  hours,
  minutes,
  timeZone = WEEKDAY_SCHEDULE_TZ
) => {
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const parts = getZonedParts(new Date(utcGuess), timeZone);
  const asLocalMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0
  );
  const wantedMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return new Date(utcGuess + (wantedMs - asLocalMs));
};

/**
 * settings에 저장된 weekdaySchedule raw 값 정규화 (enabled false 포함)
 * @returns {{ enabled: boolean, daysOfWeek: number[], startTime: string, endTime: string }|null}
 *   null = 필드 없음/비활성으로 취급할 빈 값
 * @throws {Error} message = 사용자용 한국어 오류
 */
export const normalizeWeekdayScheduleInput = (raw, settingsContext = {}) => {
  if (raw == null || raw === false) {
    return { enabled: false, daysOfWeek: [], startTime: "", endTime: "" };
  }
  if (typeof raw !== "object") {
    throw new Error("요일마다 설정 형식이 올바르지 않습니다.");
  }

  const enabled = !!raw.enabled;
  const daysRaw = Array.isArray(raw.daysOfWeek) ? raw.daysOfWeek : [];
  const daysOfWeek = [
    ...new Set(
      daysRaw
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    ),
  ].sort((a, b) => a - b);

  const startTime =
    typeof raw.startTime === "string" ? raw.startTime.trim() : "";
  const endTime = typeof raw.endTime === "string" ? raw.endTime.trim() : "";

  if (!enabled) {
    return { enabled: false, daysOfWeek, startTime, endTime };
  }

  const { requiredMode, allowMultipleResponses, openAt, closeAt } =
    settingsContext;
  if (
    !requiredMode ||
    !allowMultipleResponses ||
    !openAt ||
    !closeAt
  ) {
    throw new Error(
      "요일마다를 쓰려면 필수 응답, 복수 응답, 시작일, 마감일이 필요합니다."
    );
  }
  if (daysOfWeek.length === 0) {
    throw new Error("요일마다: 요일을 하나 이상 선택하세요.");
  }
  const start = parseHhMm(startTime);
  const end = parseHhMm(endTime);
  if (!start || !end) {
    throw new Error("요일마다: 시작·종료 시각은 HH:mm 형식이어야 합니다.");
  }
  if (
    end.hours * 60 + end.minutes <=
    start.hours * 60 + start.minutes
  ) {
    throw new Error("요일마다: 종료 시각은 시작 시각보다 뒤여야 합니다.");
  }

  return { enabled: true, daysOfWeek, startTime, endTime };
};

/**
 * 전제 + enabled 로 실제 동작 여부
 * @param {Object} form
 */
export const isWeekdayScheduleEnabled = (form) => {
  const ws = form?.settings?.weekdaySchedule;
  if (!ws?.enabled) return false;
  if (form?.settings?.requiredMode !== true) return false;
  if (!form?.settings?.allowMultipleResponses) return false;
  if (!form?.settings?.openAt || !form?.settings?.closeAt) return false;
  if (!Array.isArray(ws.daysOfWeek) || ws.daysOfWeek.length === 0) {
    return false;
  }
  if (!parseHhMm(ws.startTime) || !parseHhMm(ws.endTime)) return false;
  return true;
};

/**
 * 오늘(KST) 회차 창. 선택 요일이 아니면 null.
 * @returns {{ windowStart: Date, windowEnd: Date, dayOfWeek: number }|null}
 */
export const getOccurrenceWindow = (form, now = new Date()) => {
  if (!isWeekdayScheduleEnabled(form)) return null;
  const ws = form.settings.weekdaySchedule;
  const parts = getZonedParts(now);
  if (!ws.daysOfWeek.map(Number).includes(parts.dayOfWeek)) return null;

  const start = parseHhMm(ws.startTime);
  const end = parseHhMm(ws.endTime);
  if (!start || !end) return null;

  const windowStart = zonedLocalToUtc(
    parts.year,
    parts.month,
    parts.day,
    start.hours,
    start.minutes
  );
  const windowEnd = zonedLocalToUtc(
    parts.year,
    parts.month,
    parts.day,
    end.hours,
    end.minutes
  );
  return { windowStart, windowEnd, dayOfWeek: parts.dayOfWeek };
};

export const isInOccurrenceWindow = (form, now = new Date()) => {
  const win = getOccurrenceWindow(form, now);
  if (!win) return false;
  const t = now.getTime();
  return t >= win.windowStart.getTime() && t <= win.windowEnd.getTime();
};

const rowSubmittedAt = (row) => {
  const raw = row?._submittedAt || row?.createdAt;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const hasSubmittedCurrentOccurrence = (
  form,
  myRows = [],
  now = new Date()
) => {
  const win = getOccurrenceWindow(form, now);
  if (!win) return false;
  const start = win.windowStart.getTime();
  const end = win.windowEnd.getTime();
  return myRows.some((row) => {
    const at = rowSubmittedAt(row);
    if (!at) return false;
    const t = at.getTime();
    return t >= start && t <= end;
  });
};

/**
 * 전체 기간 안인지 (openAt/closeAt)
 */
export const isWithinFormPeriod = (form, now = new Date()) => {
  if (form?.settings?.closeAt && new Date(form.settings.closeAt) < now) {
    return false;
  }
  if (form?.settings?.openAt && new Date(form.settings.openAt) > now) {
    return false;
  }
  return true;
};

/**
 * 할 일(미제출) 노출 여부
 * @param {Object} form
 * @param {Array} myRows
 * @param {Date} now
 * @param {{ hasSubmittedForList: Function, isFormRequiredMode: Function }} deps
 */
export const shouldShowUnsubmittedTodo = (
  form,
  myRows = [],
  now = new Date(),
  deps = {}
) => {
  const {
    isFormRequiredMode = (f) => f?.settings?.requiredMode === true,
    hasSubmittedForList = (f, rows) => rows.length > 0,
  } = deps;

  if (!isFormRequiredMode(form)) return false;
  if (form.settings?.directInputMode) return false;
  if (!isWithinFormPeriod(form, now)) return false;

  if (isWeekdayScheduleEnabled(form)) {
    if (!isInOccurrenceWindow(form, now)) return false;
    if (hasSubmittedCurrentOccurrence(form, myRows, now)) return false;
    if (hasSubmittedForList(form, myRows)) return false;
    return true;
  }

  if (hasSubmittedForList(form, myRows)) return false;
  return true;
};

export const getEffectiveTodoCloseAt = (form, now = new Date()) => {
  if (isWeekdayScheduleEnabled(form)) {
    const win = getOccurrenceWindow(form, now);
    if (win && isInOccurrenceWindow(form, now)) {
      return win.windowEnd;
    }
  }
  return form?.settings?.closeAt || null;
};

/**
 * 기간·요일 기준 예상 회차 수 (힌트용, KST 달력일)
 */
export const estimateWeekdayOccurrenceCount = (form) => {
  if (!isWeekdayScheduleEnabled(form)) return null;
  const openAt = new Date(form.settings.openAt);
  const closeAt = new Date(form.settings.closeAt);
  if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime())) {
    return null;
  }
  if (closeAt < openAt) return null;

  const days = new Set(form.settings.weekdaySchedule.daysOfWeek.map(Number));
  const startParts = getZonedParts(openAt);
  const endParts = getZonedParts(closeAt);
  let y = startParts.year;
  let m = startParts.month;
  let d = startParts.day;
  const endKey = endParts.year * 10000 + endParts.month * 100 + endParts.day;

  let count = 0;
  for (let i = 0; i < 400; i += 1) {
    const key = y * 10000 + m * 100 + d;
    if (key > endKey) break;
    const noon = zonedLocalToUtc(y, m, d, 12, 0);
    if (days.has(getZonedParts(noon).dayOfWeek)) count += 1;
    const advanced = new Date(noon.getTime() + 24 * 60 * 60 * 1000);
    const ap = getZonedParts(advanced);
    y = ap.year;
    m = ap.month;
    d = ap.day;
  }
  return count;
};
