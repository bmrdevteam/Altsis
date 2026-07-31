/**
 * Timetable slot expansion for Alt Sheet 「시간표 보기」.
 * Keep in sync with backend/src/utils/timetableSlots.js (merge {{#timetable}}).
 */

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export type TTimetableField = {
  _id: string;
  label: string;
  type: string;
  options?: string[];
};

export type TTimetableRow = {
  _id?: string;
  data?: Record<string, unknown> | Map<string, unknown>;
  _respondentName?: string;
  [key: string]: unknown;
};

export type TTimetableSlot = {
  date: string;
  weekStart: string | null;
  weekday: number;
  weekdayLabel: string;
  period: string;
  row: TTimetableRow;
};

export function weekStartMonday(dateStr: string): string | null {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return formatDateOnly(d);
}

export function weekDates(weekStart: string): string[] {
  const start = parseDateOnly(weekStart);
  if (!start) return [];
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push(formatDateOnly(d));
  }
  return out;
}

export function weekdayIndexMon0(dateStr: string): number {
  const d = parseDateOnly(dateStr);
  if (!d) return -1;
  const day = d.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

export function weekdayLabel(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  if (!d) return "";
  return WEEKDAY_KO[d.getUTCDay()];
}

export function parseDateOnly(
  value: unknown,
  fallbackYear?: number | null
): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    );
  }
  const s = String(value).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  m = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\./);
  if (m) {
    const year =
      fallbackYear != null && !isNaN(fallbackYear)
        ? fallbackYear
        : new Date().getFullYear();
    return new Date(Date.UTC(year, +m[1] - 1, +m[2]));
  }

  m = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function formatDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function asArray(value: unknown): unknown[] {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .filter((v) => v != null && v !== "")
      .flatMap((v) => asArray(v));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [value];
}

function getRawField(row: TTimetableRow, fieldId: string): unknown {
  if (!row?.data || fieldId == null) return undefined;
  const id = String(fieldId);
  if (row.data instanceof Map) {
    return row.data.has(id) ? row.data.get(id) : row.data.get(fieldId);
  }
  return (row.data as Record<string, unknown>)[id] ??
    (row.data as Record<string, unknown>)[fieldId];
}

export const DATE_FIELD_TYPES = ["date", "multiDate"] as const;
export const PERIOD_FIELD_TYPES = [
  "select",
  "radio",
  "multiSelect",
  "time",
  "text",
] as const;

export function isDateFieldType(type: string): boolean {
  return (DATE_FIELD_TYPES as readonly string[]).includes(type);
}

export function isPeriodFieldType(type: string): boolean {
  return (PERIOD_FIELD_TYPES as readonly string[]).includes(type);
}

export function buildTimetableSlots(
  rows: TTimetableRow[],
  fields: TTimetableField[],
  opts: { dateLabel?: string; periodLabel?: string } | null
): { slots: TTimetableSlot[]; error: string | null; periodOrder: string[] } {
  const { dateLabel, periodLabel } = opts || {};
  if (!dateLabel || !periodLabel) {
    return {
      slots: [],
      error: "timetable에는 date=와 period= 필드 라벨이 필요합니다.",
      periodOrder: [],
    };
  }

  const fieldByLabel = new Map((fields || []).map((f) => [f.label, f]));
  const dateField = fieldByLabel.get(dateLabel);
  const periodField = fieldByLabel.get(periodLabel);

  if (!dateField) {
    return {
      slots: [],
      error: `날짜 필드 "${dateLabel}"를 양식에서 찾을 수 없습니다.`,
      periodOrder: [],
    };
  }
  if (!periodField) {
    return {
      slots: [],
      error: `교시 필드 "${periodLabel}"를 양식에서 찾을 수 없습니다.`,
      periodOrder: [],
    };
  }

  if (!isDateFieldType(dateField.type)) {
    return {
      slots: [],
      error: `"${dateLabel}" 필드는 date 또는 multiDate 타입이어야 합니다.`,
      periodOrder: [],
    };
  }
  if (!isPeriodFieldType(periodField.type)) {
    return {
      slots: [],
      error: `"${periodLabel}" 필드는 선택/시간 등 교시로 쓸 수 있는 타입이어야 합니다.`,
      periodOrder: [],
    };
  }

  const periodOrder = Array.isArray(periodField.options)
    ? [...periodField.options]
    : [];
  const periodSeen = new Set(periodOrder);
  const slots: TTimetableSlot[] = [];
  const yearHint = new Date().getFullYear();

  for (const row of rows || []) {
    const rawDates = asArray(getRawField(row, dateField._id));
    let rowYear = yearHint;
    for (const token of rawDates) {
      const withYear = parseDateOnly(token, null);
      if (withYear && /^\d{4}/.test(String(token).trim())) {
        rowYear = withYear.getUTCFullYear();
        break;
      }
    }
    const dates = rawDates
      .map((v) => {
        const parsed = parseDateOnly(v, rowYear);
        return parsed ? formatDateOnly(parsed) : null;
      })
      .filter((d): d is string => !!d);
    const periods = asArray(getRawField(row, periodField._id)).map(String);

    if (dates.length === 0 || periods.length === 0) continue;

    for (const date of dates) {
      for (const period of periods) {
        if (!period) continue;
        if (!periodSeen.has(period)) {
          periodOrder.push(period);
          periodSeen.add(period);
        }
        slots.push({
          date,
          weekStart: weekStartMonday(date),
          weekday: weekdayIndexMon0(date),
          weekdayLabel: weekdayLabel(date),
          period,
          row,
        });
      }
    }
  }

  return { slots, error: null, periodOrder };
}

export function buildWeekGrid(
  slots: TTimetableSlot[],
  periodOrder: string[],
  weekStart: string | null,
  dayIndexes?: number[] | null
) {
  let week = weekStart;
  if (!week) {
    const weeks = Array.from(
      new Set(
        slots
          .map((s) => s.weekStart)
          .filter((w): w is string => !!w)
      )
    ).sort();
    week =
      weeks[0] ||
      weekStartMonday(formatDateOnly(new Date())) ||
      formatDateOnly(new Date());
  }

  const days =
    dayIndexes && dayIndexes.length ? dayIndexes : [0, 1, 2, 3, 4, 5, 6];
  const dates = weekDates(week);
  const dayCols = days.map((i) => ({
    index: i,
    date: dates[i] || "",
    label: dates[i] ? weekdayLabel(dates[i]) : WEEKDAY_KO[(i + 1) % 7],
  }));

  const weekSlots = slots.filter((s) => s.weekStart === week);
  const periods =
    periodOrder.length > 0
      ? periodOrder
      : Array.from(new Set(weekSlots.map((s) => s.period)));

  const cellMap = new Map<string, TTimetableSlot[]>();
  for (const s of weekSlots) {
    if (!days.includes(s.weekday)) continue;
    const key = `${s.period}\t${s.weekday}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key)!.push(s);
  }

  const grid = periods.map((period) => ({
    period,
    cells: dayCols.map((col) => cellMap.get(`${period}\t${col.index}`) || []),
  }));

  return { weekStart: week, dayCols, grid, weekSlots };
}

/** Shift Monday weekStart by delta weeks. */
export function shiftWeekStart(weekStart: string, deltaWeeks: number): string {
  const d = parseDateOnly(weekStart);
  if (!d) return weekStart;
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
  return formatDateOnly(d);
}
