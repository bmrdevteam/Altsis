import { AlterError } from "./errors.js";
import { DEFAULT_TIMEZONE } from "./limits.js";

const WEEKDAY_SHORT = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export const zonedParts = (date, timeZone) => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  const weekday = WEEKDAY_SHORT[bag.weekday];
  if (!Number.isFinite(hour) || weekday == null) {
    throw new AlterError("INVALID_INPUT", 400, "시간대를 해석하지 못했습니다.");
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday,
  };
};

const zoneOffsetMs = (date, timeZone) => {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime();
};

export const zonedWallTimeToUtc = ({ year, month, day, hour, minute, timeZone }) => {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = zoneOffsetMs(new Date(utcGuess), timeZone);
  let utc = utcGuess - offset;
  const offset2 = zoneOffsetMs(new Date(utc), timeZone);
  if (offset2 !== offset) utc = utcGuess - offset2;
  return new Date(utc);
};

export const normalizeTimezone = (value) => {
  const zone = String(value || "").trim() || DEFAULT_TIMEZONE;
  try {
    zonedParts(new Date(), zone);
  } catch (err) {
    if (err instanceof AlterError) throw err;
    throw new AlterError("INVALID_INPUT", 400, "시간대를 확인할 수 없습니다.");
  }
  return zone;
};

export const seoulDay = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date instanceof Date ? date : new Date(date));
