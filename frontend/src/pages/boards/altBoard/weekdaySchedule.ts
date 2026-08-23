/**
 * AltForm 「요일마다」 회차 창 헬퍼 (Asia/Seoul) — 프론트 미러
 */
import type { TAltForm, TAltFormSettings } from "types/altForm";

export const WEEKDAY_SCHEDULE_TZ = "Asia/Seoul";

export const MAX_END_DAY_OFFSET = 14;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const OCCURRENCE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type TWeekdaySchedule = NonNullable<
  TAltFormSettings["weekdaySchedule"]
> & { endDayOffset: number };

export type TWeekdayOccurrence = {
  index: number;
  key: string;
  windowStart: Date;
  windowEnd: Date;
  dayOfWeek: number;
};

export type TWeekdayRow = {
  _submittedAt?: string | Date;
  createdAt?: string | Date;
  isDraft?: boolean;
  _weekdayOccurrenceKey?: string;
};

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

export const parseEndDayOffset = (raw: unknown): number | null => {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > MAX_END_DAY_OFFSET) return null;
  return n;
};

export const addCalendarDays = (
  year: number,
  month: number,
  day: number,
  offset: number
): { year: number; month: number; day: number } => {
  if (!offset) return { year, month, day };
  const noon = zonedLocalToUtc(year, month, day, 12, 0);
  const advanced = new Date(noon.getTime() + offset * 24 * 60 * 60 * 1000);
  const ap = getZonedParts(advanced);
  return { year: ap.year, month: ap.month, day: ap.day };
};

export const formatOccurrenceKey = (
  year: number,
  month: number,
  day: number
): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
};

export const parseOccurrenceKey = (
  key: string | undefined | null
): { year: number; month: number; day: number } | null => {
  if (typeof key !== "string") return null;
  const m = OCCURRENCE_KEY_RE.exec(key.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
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

export const listOccurrences = (
  form: Pick<TAltForm, "settings">
): TWeekdayOccurrence[] => {
  if (!isWeekdayScheduleEnabled(form)) return [];
  const ws = form.settings.weekdaySchedule!;
  const start = parseHhMm(ws.startTime);
  const end = parseHhMm(ws.endTime);
  if (!start || !end) return [];
  const offset = parseEndDayOffset(ws.endDayOffset) ?? 0;

  const openAt = new Date(form.settings.openAt!);
  const closeAt = new Date(form.settings.closeAt!);
  if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime())) {
    return [];
  }

  const days = new Set(ws.daysOfWeek.map(Number));
  const startParts = getZonedParts(openAt);
  const endParts = getZonedParts(closeAt);
  let y = startParts.year;
  let m = startParts.month;
  let d = startParts.day;
  const endKey = endParts.year * 10000 + endParts.month * 100 + endParts.day;
  const openMs = openAt.getTime();
  const closeMs = closeAt.getTime();

  const result: TWeekdayOccurrence[] = [];
  let index = 0;
  for (let i = 0; i < 400; i += 1) {
    const dateKey = y * 10000 + m * 100 + d;
    if (dateKey > endKey) break;
    const noon = zonedLocalToUtc(y, m, d, 12, 0);
    const dayOfWeek = getZonedParts(noon).dayOfWeek;
    if (days.has(dayOfWeek)) {
      const endDate = addCalendarDays(y, m, d, offset);
      const rawStart = zonedLocalToUtc(y, m, d, start.hours, start.minutes);
      const rawEnd = zonedLocalToUtc(
        endDate.year,
        endDate.month,
        endDate.day,
        end.hours,
        end.minutes
      );
      const windowStartMs = Math.max(rawStart.getTime(), openMs);
      const windowEndMs = Math.min(rawEnd.getTime(), closeMs);
      if (windowStartMs <= windowEndMs) {
        index += 1;
        result.push({
          index,
          key: formatOccurrenceKey(y, m, d),
          windowStart: new Date(windowStartMs),
          windowEnd: new Date(windowEndMs),
          dayOfWeek,
        });
      }
    }
    const advanced = new Date(noon.getTime() + 24 * 60 * 60 * 1000);
    const ap = getZonedParts(advanced);
    y = ap.year;
    m = ap.month;
    d = ap.day;
  }
  return result;
};

export const getOpenOccurrences = (
  form: Pick<TAltForm, "settings">,
  now: Date = new Date()
): TWeekdayOccurrence[] => {
  const t = now.getTime();
  return listOccurrences(form).filter(
    (occ) => t >= occ.windowStart.getTime() && t <= occ.windowEnd.getTime()
  );
};

export const getOccurrenceWindow = (
  form: Pick<TAltForm, "settings">,
  now: Date = new Date()
): TWeekdayOccurrence | null => {
  const open = getOpenOccurrences(form, now);
  return open[0] || null;
};

export const isInOccurrenceWindow = (
  form: Pick<TAltForm, "settings">,
  now: Date = new Date()
): boolean => getOpenOccurrences(form, now).length > 0;

const rowSubmittedAt = (row: TWeekdayRow): Date | null => {
  const raw = row?._submittedAt || row?.createdAt;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const rowMatchesOccurrence = (
  row: TWeekdayRow,
  occ: TWeekdayOccurrence,
  allOccurrences: TWeekdayOccurrence[] = []
): boolean => {
  if (!row || !occ) return false;
  const key =
    typeof row._weekdayOccurrenceKey === "string"
      ? row._weekdayOccurrenceKey.trim()
      : "";
  if (key) return key === occ.key;
  const at = rowSubmittedAt(row);
  if (!at) return false;
  const t = at.getTime();
  if (t < occ.windowStart.getTime() || t > occ.windowEnd.getTime()) {
    return false;
  }
  const inOthers = allOccurrences.some(
    (other) =>
      other.key !== occ.key &&
      t >= other.windowStart.getTime() &&
      t <= other.windowEnd.getTime()
  );
  return !inOthers;
};

export const hasSubmittedOccurrence = (
  form: Pick<TAltForm, "settings">,
  myRows: TWeekdayRow[] = [],
  occ: TWeekdayOccurrence | null
): boolean => {
  if (!occ) return false;
  const all = listOccurrences(form);
  return myRows.some((row) => {
    if (row?.isDraft) return false;
    return rowMatchesOccurrence(row, occ, all);
  });
};

export const hasSubmittedCurrentOccurrence = (
  form: Pick<TAltForm, "settings">,
  myRows: TWeekdayRow[] = [],
  now: Date = new Date()
): boolean => {
  const open = getOpenOccurrences(form, now);
  if (open.length === 0) return false;
  return open.every((occ) => hasSubmittedOccurrence(form, myRows, occ));
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
    const open = getOpenOccurrences(form, now);
    if (open.length > 0) {
      return open[0].windowEnd.toISOString();
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

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export const formatOccurrenceStatusLabel = (
  occ: TWeekdayOccurrence
): string => {
  const start = parseOccurrenceKey(occ.key);
  const startParts = start
    ? getZonedParts(zonedLocalToUtc(start.year, start.month, start.day, 12, 0))
    : getZonedParts(occ.windowStart);
  const endParts = getZonedParts(occ.windowEnd);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDow = WEEKDAY_LABELS[startParts.dayOfWeek] || "";
  const endDow = WEEKDAY_LABELS[endParts.dayOfWeek] || "";
  return `${occ.index}회차 · ${startDow} ${startParts.month}/${startParts.day} · 마감 ${endDow} ${pad(endParts.hour)}:${pad(endParts.minute)}`;
};

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
  endDayOffset: 0,
});
