/**
 * AltForm 「요일마다」 회차 창 헬퍼 (Asia/Seoul) — 프론트 미러
 */
import type { TAltForm, TAltFormSettings } from "types/altForm";

export const WEEKDAY_SCHEDULE_TZ = "Asia/Seoul";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type TWeekdaySchedule = NonNullable<TAltFormSettings["weekdaySchedule"]>;

export const parseHhMm = (
  timeStr: string | undefined | null
): { hours: number; minutes: number } | null => {
  if (typeof timeStr !== "string") return null;
  const m = TIME_RE.exec(timeStr.trim());
  if (!m) return null;
  return { hours: Number(m[1]), minutes: Number(m[2]) };
};

export const getZonedParts = (
  date: Date,
  timeZone = WEEKDAY_SCHEDULE_TZ
) => {
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
  const weekdayMap: Record<string, number> = {
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
    dayOfWeek: weekdayMap[parts.weekday as string],
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

export const zonedLocalToUtc = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone = WEEKDAY_SCHEDULE_TZ
): Date => {
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

export const isWeekdayScheduleEnabled = (
  form: Pick<TAltForm, "settings"> | { settings?: TAltFormSettings }
): boolean => {
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

export const getOccurrenceWindow = (
  form: Pick<TAltForm, "settings">,
  now: Date = new Date()
): { windowStart: Date; windowEnd: Date; dayOfWeek: number } | null => {
  if (!isWeekdayScheduleEnabled(form)) return null;
  const ws = form.settings.weekdaySchedule!;
  const parts = getZonedParts(now);
  if (!ws.daysOfWeek.map(Number).includes(parts.dayOfWeek)) return null;

  const start = parseHhMm(ws.startTime);
  const end = parseHhMm(ws.endTime);
  if (!start || !end) return null;

  return {
    windowStart: zonedLocalToUtc(
      parts.year,
      parts.month,
      parts.day,
      start.hours,
      start.minutes
    ),
    windowEnd: zonedLocalToUtc(
      parts.year,
      parts.month,
      parts.day,
      end.hours,
      end.minutes
    ),
    dayOfWeek: parts.dayOfWeek,
  };
};

export const isInOccurrenceWindow = (
  form: Pick<TAltForm, "settings">,
  now: Date = new Date()
): boolean => {
  const win = getOccurrenceWindow(form, now);
  if (!win) return false;
  const t = now.getTime();
  return t >= win.windowStart.getTime() && t <= win.windowEnd.getTime();
};

const rowSubmittedAt = (row: {
  _submittedAt?: string | Date;
  createdAt?: string | Date;
}): Date | null => {
  const raw = row?._submittedAt || row?.createdAt;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const hasSubmittedCurrentOccurrence = (
  form: Pick<TAltForm, "settings">,
  myRows: {
    _submittedAt?: string | Date;
    createdAt?: string | Date;
    isDraft?: boolean;
  }[] = [],
  now: Date = new Date()
): boolean => {
  const win = getOccurrenceWindow(form, now);
  if (!win) return false;
  const start = win.windowStart.getTime();
  const end = win.windowEnd.getTime();
  return myRows.some((row) => {
    if (row?.isDraft) return false;
    const at = rowSubmittedAt(row);
    if (!at) return false;
    const t = at.getTime();
    return t >= start && t <= end;
  });
};

export const isWithinFormPeriod = (
  form: Pick<TAltForm, "settings">,
  now: Date = new Date()
): boolean => {
  if (form.settings?.closeAt && new Date(form.settings.closeAt) < now) {
    return false;
  }
  if (form.settings?.openAt && new Date(form.settings.openAt) > now) {
    return false;
  }
  return true;
};

const getRequiredResponseCountLocal = (
  form: Pick<TAltForm, "settings">
): number | null => {
  if (form.settings?.requiredMode !== true) return null;
  if (!form.settings?.allowMultipleResponses) return null;
  const n = Number(form.settings.requiredResponseCount);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
};

const hasSubmittedForListLocal = (
  form: Pick<TAltForm, "settings">,
  myResponseCount: number
): boolean => {
  if (myResponseCount <= 0) return false;
  const target = getRequiredResponseCountLocal(form);
  if (target != null) return myResponseCount >= target;
  return true;
};

/** list meta 우선, 없으면 회차 창만으로 추정(제출 시각 없으면 false) */
export const shouldShowUnsubmittedTodoForm = (
  form: TAltForm,
  now: Date = new Date()
): boolean => {
  if (form.myRespondent === false) return false;
  if (form.isDraft) return false;
  if (form.settings?.requiredMode !== true) return false;
  if (form.settings?.directInputMode) return false;
  if (!isWithinFormPeriod(form, now)) return false;

  const count = form.myResponseCount ?? 0;
  if (hasSubmittedForListLocal(form, count)) return false;

  if (isWeekdayScheduleEnabled(form)) {
    const inWindow =
      form.inOccurrenceWindow != null
        ? form.inOccurrenceWindow
        : isInOccurrenceWindow(form, now);
    if (!inWindow) return false;
    if (form.submittedCurrentOccurrence === true) return false;
    return true;
  }

  return !form.mySubmitted;
};

export const getEffectiveTodoCloseAtLocal = (
  form: TAltForm,
  now: Date = new Date()
): string | null => {
  if (form.occurrenceCloseAt) return form.occurrenceCloseAt;
  if (isWeekdayScheduleEnabled(form)) {
    const win = getOccurrenceWindow(form, now);
    if (win && isInOccurrenceWindow(form, now)) {
      return win.windowEnd.toISOString();
    }
  }
  return form.settings?.closeAt || null;
};

/** 월=1 … 일=0 표시 순서용 */
export const WEEKDAY_LABELS_MON_FIRST: { day: number; label: string }[] = [
  { day: 1, label: "월" },
  { day: 2, label: "화" },
  { day: 3, label: "수" },
  { day: 4, label: "목" },
  { day: 5, label: "금" },
  { day: 6, label: "토" },
  { day: 0, label: "일" },
];

export const canEnableWeekdaySchedule = (settings: {
  requiredMode?: boolean;
  allowMultipleResponses?: boolean;
  openAt?: string;
  closeAt?: string;
}): boolean =>
  !!settings.requiredMode &&
  !!settings.allowMultipleResponses &&
  !!settings.openAt &&
  !!settings.closeAt;

export const estimateWeekdayOccurrenceCount = (
  settings: TAltFormSettings
): number | null => {
  const form = { settings };
  if (!isWeekdayScheduleEnabled(form)) return null;
  const openAt = new Date(settings.openAt!);
  const closeAt = new Date(settings.closeAt!);
  if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime())) {
    return null;
  }
  if (closeAt < openAt) return null;

  const days = new Set(settings.weekdaySchedule!.daysOfWeek.map(Number));
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

export const defaultWeekdaySchedule = (): TWeekdaySchedule => ({
  enabled: false,
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "18:00",
});
