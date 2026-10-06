/**
 * Wall-clock schedule math for Alter routines.
 * Asia/Seoul is the default. Weekdays are 0 (Sunday) through 6 (Saturday)
 * in that timezone, matching Date#getUTCDay after the zone conversion.
 */

import { createHash } from "crypto";

export const DEFAULT_TIMEZONE = "Asia/Seoul";
export const MIN_INTERVAL_MS = 60 * 60 * 1000;
export const MAX_SCHEDULES_PER_USER = 5;
export const MAX_RUN_HISTORY = 10;
export const TITLE_MAX = 80;
export const PROMPT_MAX = 2000;
export const SUMMARY_MAX = 280;
export const NOTIFY_MAX = 180;
export const CLAIM_LEASE_MS = 10 * 60 * 1000;

const WEEKDAY_SHORT = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** Imperatives only. Bare nouns (미제출, 결재 대기, 채점할 게) stay readable. */
const WRITE_INTENT =
  /(제출|채점|삭제|결재|승인|반려|수정|등록)\s*해|(제출|채점|삭제|결재|승인|반려|수정|등록)하|지워|보내|고쳐|\bsubmit\b|\bapprove\b|\bdelete\b|\bgrade\b/i;

export const READ_ONLY_SCHEDULE_HINT =
  "대신 조회만 하는 내용으로 제안하세요. 예: 매일 9시에 채점할 항목이 있는지 정리.";

export const scheduleError = (status, message, code = "INVALID_SCHEDULE") => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

const clipText = (value, max) => String(value ?? "").trim().slice(0, max);

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
    throw scheduleError(400, "시간대를 해석하지 못했습니다.");
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

const addCalendarDays = (parts, days) => {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
};

export const normalizeTimezone = (value) => {
  const zone = String(value || "").trim() || DEFAULT_TIMEZONE;
  try {
    zonedParts(new Date(), zone);
  } catch (err) {
    if (err?.code === "INVALID_SCHEDULE") throw err;
    throw scheduleError(400, "시간대를 확인할 수 없습니다.");
  }
  return zone;
};

export const parseClock = (value) => {
  const match = TIME_RE.exec(String(value || "").trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

export const normalizeWeekdays = (value) => {
  const list = Array.isArray(value) ? value : [];
  const days = [];
  for (const raw of list) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 6) {
      throw scheduleError(400, "요일은 0(일)부터 6(토)까지입니다.");
    }
    if (!days.includes(n)) days.push(n);
  }
  days.sort((a, b) => a - b);
  return days;
};

/**
 * Next instant strictly after `from`. Daily and weekly fire at most once
 * per calendar day in the schedule timezone, so the gap is at least a day.
 * @returns {Date|null}
 */
export const computeNextRunAt = (spec, from = new Date()) => {
  const timezone = spec?.timezone || DEFAULT_TIMEZONE;
  const kind = spec?.kind;
  const origin = from instanceof Date ? from : new Date(from);
  if (!Number.isFinite(origin.getTime())) return null;

  if (kind === "once") {
    const at = spec.onceAt instanceof Date ? spec.onceAt : new Date(spec.onceAt);
    if (!Number.isFinite(at.getTime()) || at.getTime() <= origin.getTime()) return null;
    return at;
  }

  const clock = parseClock(spec?.time);
  if (!clock) return null;
  const weekdays = kind === "weekly" ? normalizeWeekdays(spec.weekdays) : null;
  if (kind === "weekly" && (!weekdays || !weekdays.length)) return null;
  if (kind !== "daily" && kind !== "weekly") return null;

  let start;
  try {
    start = zonedParts(origin, timezone);
  } catch (_) {
    return null;
  }
  for (let add = 0; add <= 14; add += 1) {
    const wall = addCalendarDays(start, add);
    if (weekdays && !weekdays.includes(wall.weekday)) continue;
    const candidate = zonedWallTimeToUtc({
      year: wall.year,
      month: wall.month,
      day: wall.day,
      hour: clock.hour,
      minute: clock.minute,
      timeZone: timezone,
    });
    if (candidate.getTime() > origin.getTime()) return candidate;
  }
  return null;
};

export const assertMinInterval = (spec, from = new Date()) => {
  if (spec?.kind === "once") return;
  const first = computeNextRunAt(spec, from);
  if (!first) throw scheduleError(400, "다음 실행 시각을 계산할 수 없습니다.");
  const second = computeNextRunAt(spec, first);
  if (!second) throw scheduleError(400, "반복 간격을 계산할 수 없습니다.");
  if (second.getTime() - first.getTime() < MIN_INTERVAL_MS) {
    throw scheduleError(400, "예약은 최소 1시간 간격으로만 반복할 수 있습니다.");
  }
};

export const assertReadOnlyPrompt = (prompt) => {
  const text = String(prompt || "").trim();
  if (!text) throw scheduleError(400, "실행할 내용을 입력해 주세요.");
  if (text.length > PROMPT_MAX) {
    throw scheduleError(400, `내용은 ${PROMPT_MAX}자 이하로 적어 주세요.`);
  }
  if (WRITE_INTENT.test(text)) {
    throw scheduleError(
      400,
      `예약으로 저장하는 내용은 조회와 안내만 가능합니다. ${READ_ONLY_SCHEDULE_HINT}`
    );
  }
  return text;
};

export const normalizeScheduleInput = (raw = {}) => {
  const kind = String(raw.kind || "").trim();
  if (kind !== "once" && kind !== "daily" && kind !== "weekly") {
    throw scheduleError(400, "반복은 한 번, 매일, 매주 중에서 고르세요.");
  }
  if (kind === "once") {
    const onceAt = new Date(raw.onceAt);
    if (!Number.isFinite(onceAt.getTime())) {
      throw scheduleError(400, "한 번 실행할 시각이 필요합니다.");
    }
    return { kind, onceAt };
  }
  const clock = parseClock(raw.time);
  if (!clock) throw scheduleError(400, "시각은 HH:mm 형식이어야 합니다.");
  const time = `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
  if (kind === "daily") return { kind, time };
  const weekdays = normalizeWeekdays(raw.weekdays);
  if (!weekdays.length) throw scheduleError(400, "매주 실행은 요일을 하루 이상 고르세요.");
  return { kind, time, weekdays };
};

export const buildScheduleFields = (raw, from = new Date()) => {
  const timezone = normalizeTimezone(raw?.timezone);
  const schedule = normalizeScheduleInput(raw?.schedule || raw || {});
  const spec = { ...schedule, timezone };
  const title = clipText(raw?.title, TITLE_MAX);
  const prompt = assertReadOnlyPrompt(raw?.prompt);
  if (!title) throw scheduleError(400, "예약 이름을 입력해 주세요.");
  const nextRunAt = computeNextRunAt(spec, from);
  if (!nextRunAt) {
    throw scheduleError(400, "다음 실행 시각이 미래여야 합니다.");
  }
  assertMinInterval(spec, from);
  const proposalKey = scheduleIdentityKey({ title, prompt, schedule, timezone });
  return { title, prompt, schedule, timezone, nextRunAt, proposalKey };
};

/** Same title, prompt, and slot confirm as one schedule. */
export const scheduleIdentityKey = (fields) => {
  const schedule = fields?.schedule || {};
  const weekdays = Array.isArray(schedule.weekdays) ? [...schedule.weekdays] : [];
  const onceAt = schedule.onceAt ? new Date(schedule.onceAt).toISOString() : "";
  const payload = JSON.stringify({
    title: String(fields?.title || "").trim(),
    prompt: String(fields?.prompt || "").trim(),
    timezone: fields?.timezone || DEFAULT_TIMEZONE,
    kind: schedule.kind || "",
    time: schedule.time || "",
    weekdays,
    onceAt: onceAt === "Invalid Date" ? "" : onceAt,
  });
  return createHash("sha256").update(payload).digest("hex");
};

export const stripMarkdown = (text) =>
  String(text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`\n]*)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");

export const claimQuery = (now) => ({
  enabled: true,
  nextRunAt: { $lte: now },
  $or: [
    { claimUntil: null },
    { claimUntil: { $exists: false } },
    { claimUntil: { $lte: now } },
  ],
});

export const matchesClaimQuery = (doc, now) => {
  if (!doc || doc.enabled === false) return false;
  if (!doc.nextRunAt) return false;
  const due = new Date(doc.nextRunAt).getTime();
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(due) || due > at) return false;
  if (doc.claimUntil) {
    const held = new Date(doc.claimUntil).getTime();
    if (Number.isFinite(held) && held > at) return false;
  }
  return true;
};

export const slotKey = (academyId, doc) => {
  const when = new Date(doc?.nextRunAt).toISOString();
  return `scheduler:dedup:alter-schedule:${academyId}:${doc?._id}:${when}`;
};

export const truncateSummary = (text, max = SUMMARY_MAX) => {
  const value = stripMarkdown(text).replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const toolNamesOf = (outcome) =>
  (Array.isArray(outcome?.toolNames) ? outcome.toolNames : [])
    .map((name) => String(name || "").trim().slice(0, 64))
    .filter((name) => name && name !== "_parse")
    .slice(0, 8);

const scheduleSpecOf = (doc) => ({
  ...(doc?.schedule || {}),
  timezone: doc?.timezone || DEFAULT_TIMEZONE,
});

/**
 * Advance nextRunAt after a tick. A manual run keeps a still-future slot.
 */
export const nextStateAfterRun = (doc, outcome, options = {}) => {
  const at = outcome.at instanceof Date ? outcome.at : new Date(outcome.at || Date.now());
  const status = outcome.status;
  const summary = truncateSummary(outcome.summary || outcome.reason || "");
  const conversationId = outcome.conversationId ? String(outcome.conversationId) : "";
  const runs = [
    ...(Array.isArray(doc?.runs) ? doc.runs : []),
    {
      at,
      status,
      summary,
      conversationId,
      reason: status === "ok" ? "" : summary,
      toolNames: toolNamesOf(outcome),
    },
  ].slice(-MAX_RUN_HISTORY);

  const future =
    options.preserveFutureSlot &&
    doc?.nextRunAt &&
    new Date(doc.nextRunAt).getTime() > at.getTime();

  let enabled = doc?.enabled !== false;
  let nextRunAt = doc?.nextRunAt || null;
  if (future) {
    nextRunAt = new Date(doc.nextRunAt);
  } else if (doc?.schedule?.kind === "once") {
    enabled = false;
    nextRunAt = null;
  } else {
    nextRunAt = computeNextRunAt(scheduleSpecOf(doc), at);
    if (!nextRunAt) enabled = false;
  }

  return {
    runs,
    enabled,
    nextRunAt,
    lastRunAt: at,
    lastStatus: status,
    lastResultSummary: summary,
    claimUntil: null,
    claimToken: "",
  };
};

export const skipReasonForCode = (code, message) => {
  if (code === "AI_NOT_ENABLED" || code === "AI_NOT_ENABLED_FOR_SEASON") {
    return "AI가 꺼져 있어 건너뛰었습니다.";
  }
  if (code === "AI_USAGE_LIMIT_EXCEEDED") {
    return "오늘 사용량을 초과해 건너뛰었습니다.";
  }
  if (code === "PERMISSION_DENIED") {
    return "선생님이 아니어서 건너뛰었습니다.";
  }
  if (code === "SCHEDULE_USER_MISSING") {
    return "사용자를 찾을 수 없어 건너뛰었습니다.";
  }
  if (code === "REGISTRATION_NOT_FOUND" || code === "SCHEDULE_NOT_TEACHER") {
    return "선생님이 아니어서 건너뛰었습니다.";
  }
  if (code === "SEASON_NOT_FOUND") {
    return "학기를 찾을 수 없어 건너뛰었습니다.";
  }
  const text = String(message || "").trim();
  if (/registration/i.test(text)) return "선생님이 아니어서 건너뛰었습니다.";
  return text ? truncateSummary(text, 120) : "실행 조건이 맞지 않아 건너뛰었습니다.";
};
