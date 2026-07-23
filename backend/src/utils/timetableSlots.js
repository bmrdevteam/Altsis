/**
 * Timetable slot expansion for Alt Docs merge {{#timetable}}
 * Expands sheet rows into date × period slots for weekly grid rendering.
 */

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Monday-start week key YYYY-MM-DD (the Monday of that week).
 * @param {string} dateStr YYYY-MM-DD or parseable date
 */
export function weekStartMonday(dateStr) {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return formatDateOnly(d);
}

/**
 * @param {string} weekStart YYYY-MM-DD Monday
 * @returns {string[]} seven YYYY-MM-DD from Mon..Sun
 */
export function weekDates(weekStart) {
  const start = parseDateOnly(weekStart);
  if (!start) return [];
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push(formatDateOnly(d));
  }
  return out;
}

export function weekdayIndexMon0(dateStr) {
  const d = parseDateOnly(dateStr);
  if (!d) return -1;
  const day = d.getUTCDay();
  return day === 0 ? 6 : day - 1; // Mon=0 .. Sun=6
}

export function weekdayLabel(dateStr) {
  const d = parseDateOnly(dateStr);
  if (!d) return "";
  return WEEKDAY_KO[d.getUTCDay()];
}

/**
 * Parse a single date token into UTC midnight Date.
 * Accepts ISO (YYYY-MM-DD), dotted KR (2026. 08. 12. (수)), year-less (08. 12. (수)).
 * @param {unknown} value
 * @param {number} [fallbackYear]
 * @returns {Date|null}
 */
export function parseDateOnly(value, fallbackYear) {
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

  // 2026. 08. 12. / 2026.08.12. (수)
  m = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  // 08. 12. (수) — year omitted (CSV round-trip of same-year multiDate)
  m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\./);
  if (m) {
    const year =
      fallbackYear != null && !isNaN(fallbackYear)
        ? fallbackYear
        : new Date().getFullYear();
    return new Date(Date.UTC(year, +m[1] - 1, +m[2]));
  }

  // 2026/08/12 or 2026.08.12 without spaces
  m = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  );
}

function formatDateOnly(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normalize field values to a flat list.
 * Splits comma-separated CSV / display strings (e.g. "08. 12. (수), 08. 19. (수)").
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function asArray(value) {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .filter((v) => v != null && v !== "")
      .flatMap((v) => asArray(v));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Multi-date / multi-select CSV: "a, b, c" or "08. 12. (수), 08. 19. (수)"
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

function getRawField(row, fieldId) {
  if (!row?.data || fieldId == null) return undefined;
  const id = String(fieldId);
  if (row.data instanceof Map) {
    return row.data.has(id)
      ? row.data.get(id)
      : row.data.get(fieldId);
  }
  return row.data[id] ?? row.data[fieldId];
}

/**
 * Coerce a CSV / sheet cell string into a typed field value.
 * Used by CSV import so multiDate/multiSelect round-trip correctly.
 * @param {string} raw
 * @param {{ type?: string }} field
 * @returns {unknown}
 */
export function coerceFieldValueFromCsv(raw, field) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === "") return null;

  const type = field?.type;
  if (type === "multiDate") {
    const yearHint = new Date().getFullYear();
    return asArray(text)
      .map((token) => {
        const d = parseDateOnly(token, yearHint);
        return d ? formatDateOnly(d) : null;
      })
      .filter(Boolean);
  }
  if (type === "date") {
    const d = parseDateOnly(text, new Date().getFullYear());
    return d ? formatDateOnly(d) : text;
  }
  if (type === "multiSelect" || type === "checkbox") {
    return asArray(text);
  }
  if (type === "number" || type === "rating" || type === "scale" || type === "counter") {
    const n = Number(text.replace(/,/g, ""));
    return isNaN(n) ? text : n;
  }
  if (type === "boolean") {
    if (/^(y|yes|true|예|o|1)$/i.test(text)) return true;
    if (/^(n|no|false|아니오|x|0)$/i.test(text)) return false;
    return text;
  }
  return text;
}

/**
 * @param {object[]} rows
 * @param {object[]} fields AltForm fields
 * @param {{ dateLabel: string, periodLabel: string }} opts
 * @returns {{ slots: object[], error: string|null, periodOrder: string[] }}
 */
export function buildTimetableSlots(rows, fields, opts) {
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

  const dateOk = ["date", "multiDate"].includes(dateField.type);
  const periodOk = ["select", "radio", "multiSelect", "time", "text"].includes(
    periodField.type
  );
  if (!dateOk) {
    return {
      slots: [],
      error: `"${dateLabel}" 필드는 date 또는 multiDate 타입이어야 합니다.`,
      periodOrder: [],
    };
  }
  if (!periodOk) {
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
  const slots = [];
  const yearHint = new Date().getFullYear();

  for (const row of rows || []) {
    // Prefer an explicit year from any ISO token in the same cell, else calendar year
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
      .filter(Boolean);
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

/**
 * Filter slots to one week and build period × weekday grid of slot lists.
 * @param {object[]} slots
 * @param {string[]} periodOrder
 * @param {string|null} weekStart Monday YYYY-MM-DD; null = first week in data
 * @param {number[]|null} dayIndexes Mon=0..Sun=6; null = all 7
 */
export function buildWeekGrid(slots, periodOrder, weekStart, dayIndexes) {
  let week = weekStart;
  if (!week) {
    const weeks = [
      ...new Set(slots.map((s) => s.weekStart).filter(Boolean)),
    ].sort();
    week = weeks[0] || weekStartMonday(formatDateOnly(new Date()));
  }

  const days =
    dayIndexes && dayIndexes.length
      ? dayIndexes
      : [0, 1, 2, 3, 4, 5, 6];
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
      : [...new Set(weekSlots.map((s) => s.period))];

  /** @type {Map<string, object[]>} key = `${period}\t${weekday}` */
  const cellMap = new Map();
  for (const s of weekSlots) {
    if (!days.includes(s.weekday)) continue;
    const key = `${s.period}\t${s.weekday}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key).push(s);
  }

  const grid = periods.map((period) => ({
    period,
    cells: dayCols.map((col) => cellMap.get(`${period}\t${col.index}`) || []),
  }));

  return { weekStart: week, dayCols, grid, weekSlots };
}

/**
 * Parse {{#timetable date=X period=Y ...}} attrs.
 * Supports date=라벨 period=라벨, optional week=YYYY-MM-DD, days=월,화,수
 */
export function parseTimetableAttrs(attrStr) {
  const attrs = {};
  const re = /(\w+)=([^\s]+)/g;
  let m;
  while ((m = re.exec(attrStr || "")) !== null) {
    attrs[m[1]] = m[2].trim();
  }
  const dayMap = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };
  let dayIndexes = null;
  if (attrs.days) {
    dayIndexes = attrs.days
      .split(",")
      .map((d) => dayMap[d.trim()])
      .filter((n) => n !== undefined);
    if (dayIndexes.length === 0) dayIndexes = null;
  }
  return {
    dateLabel: attrs.date || "",
    periodLabel: attrs.period || "",
    weekStart: attrs.week || null,
    dayIndexes,
  };
}
