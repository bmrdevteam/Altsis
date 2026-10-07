/**
 * Wall-clock schedule math for Alter routines.
 * Asia/Seoul is the default. Weekdays are 0 (Sunday) through 6 (Saturday)
 * in that timezone, matching Date#getUTCDay after the zone conversion.
 */

import {
  CLAIM_LEASE_MS,
  DEBOUNCE_CHOICES_MS,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_TIMEZONE,
  EVENT_TYPES,
  MAX_CONSECUTIVE_ERRORS,
  MAX_EVENT_ROUTINES,
  MAX_PENDING_EVENTS,
  MAX_ROUTINE_RUNS_PER_DAY,
  MAX_RUN_HISTORY,
  MAX_SCHEDULES_PER_USER,
  MAX_USER_EVENT_RUNS_PER_DAY,
  MIN_INTERVAL_MS,
  NOTIFY_MAX,
  PROMPT_MAX,
  SUMMARY_MAX,
  TITLE_MAX,
} from "../alter/core/limits.js";
import { scheduleError } from "../alter/core/errors.js";
import { assertDmOptIn } from "../alter/policy/access.js";
import {
  normalizeTimezone,
  seoulDay,
  zonedParts,
  zonedWallTimeToUtc,
} from "../alter/core/time.js";
import { scheduleIdentityKey, slotKey } from "../alter/core/ids.js";
import { stripMarkdown, truncateSummary } from "../alter/core/text.js";

export {
  CLAIM_LEASE_MS,
  DEBOUNCE_CHOICES_MS,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_TIMEZONE,
  EVENT_TYPES,
  MAX_CONSECUTIVE_ERRORS,
  MAX_EVENT_ROUTINES,
  MAX_PENDING_EVENTS,
  MAX_ROUTINE_RUNS_PER_DAY,
  MAX_RUN_HISTORY,
  MAX_SCHEDULES_PER_USER,
  MAX_USER_EVENT_RUNS_PER_DAY,
  MIN_INTERVAL_MS,
  NOTIFY_MAX,
  PROMPT_MAX,
  SUMMARY_MAX,
  TITLE_MAX,
  scheduleError,
  normalizeTimezone,
  seoulDay,
  zonedParts,
  zonedWallTimeToUtc,
  scheduleIdentityKey,
  slotKey,
  stripMarkdown,
  truncateSummary,
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** Imperatives only. Bare nouns (미제출, 결재 대기, 채점할 게) stay readable. */
const WRITE_INTENT =
  /(제출|채점|삭제|결재|승인|반려|수정|등록)\s*해|(제출|채점|삭제|결재|승인|반려|수정|등록)하|지워|보내|고쳐|\bsubmit\b|\bapprove\b|\bdelete\b|\bgrade\b/i;

export const READ_ONLY_SCHEDULE_HINT =
  "대신 조회만 하는 내용으로 제안하세요. 예: 매일 9시에 채점할 항목이 있는지 정리.";

const clipText = (value, max) => String(value ?? "").trim().slice(0, max);

const addCalendarDays = (parts, days) => {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
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

const idList = (value, max = 20) =>
  [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(
    0,
    max
  );

export const normalizeEventSpec = (raw = {}) => {
  const types = idList(raw.types, EVENT_TYPES.length).filter((type) => EVENT_TYPES.includes(type));
  if (!types.length) throw scheduleError(400, "이벤트 종류를 하나 이상 고르세요.");
  const requested = Number(raw.debounceMs);
  const debounceMs = DEBOUNCE_CHOICES_MS.includes(requested) ? requested : DEFAULT_DEBOUNCE_MS;
  const minIntervalMs = Math.max(
    MIN_INTERVAL_MS,
    Number(raw.minIntervalMs) > 0 ? Number(raw.minIntervalMs) : MIN_INTERVAL_MS
  );
  const scope = String(raw.filters?.calendarScope || "");
  const filters = {
    boardIds: idList(raw.filters?.boardIds),
    formIds: idList(raw.filters?.formIds),
    senderUserIds: idList(raw.filters?.senderUserIds),
    calendarScope: ["personal", "school", "all"].includes(scope) ? scope : "",
  };
  const dmOptIn = raw.dmOptIn === true;
  assertDmOptIn(types, dmOptIn);
  return { types, filters, debounceMs, minIntervalMs, dmOptIn };
};

const buildEventFields = (raw) => {
  const timezone = normalizeTimezone(raw?.timezone);
  const title = clipText(raw?.title, TITLE_MAX);
  const prompt = assertReadOnlyPrompt(raw?.prompt);
  if (!title) throw scheduleError(400, "예약 이름을 입력해 주세요.");
  const event = normalizeEventSpec(raw.event || raw);
  const proposalKey = scheduleIdentityKey({
    title,
    prompt,
    timezone,
    trigger: "event",
    event,
  });
  return {
    title,
    prompt,
    timezone,
    trigger: "event",
    event,
    nextRunAt: null,
    proposalKey,
  };
};

export const buildScheduleFields = (raw, from = new Date()) => {
  if (raw?.trigger === "event") return buildEventFields(raw);
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
  return { title, prompt, schedule, timezone, nextRunAt, proposalKey, trigger: "time" };
};

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
  const eventRun = (doc?.trigger || "time") === "event";
  const claimedAt = options.claimedAt ? new Date(options.claimedAt) : at;
  const pendingEvents = Array.isArray(doc?.pending?.events) ? doc.pending.events : [];
  const eventCount = eventRun
    ? pendingEvents.filter((evt) => new Date(evt.at).getTime() <= claimedAt.getTime()).length
    : 0;
  const runs = [
    ...(Array.isArray(doc?.runs) ? doc.runs : []),
    {
      at,
      status,
      summary,
      conversationId,
      reason: status === "ok" ? "" : summary,
      toolNames: toolNamesOf(outcome),
      ...(eventRun ? { triggerType: "event", eventCount } : {}),
    },
  ].slice(-MAX_RUN_HISTORY);

  if (eventRun) {
    const remaining = pendingEvents.filter(
      (evt) => new Date(evt.at).getTime() > claimedAt.getTime()
    );
    let consecutiveErrors = Number(doc?.consecutiveErrors) || 0;
    if (status === "error") consecutiveErrors += 1;
    else if (status === "ok") consecutiveErrors = 0;
    let enabled = doc?.enabled !== false && consecutiveErrors < MAX_CONSECUTIVE_ERRORS;
    const debounce = doc?.event?.debounceMs || DEFAULT_DEBOUNCE_MS;
    const minInterval = doc?.event?.minIntervalMs || MIN_INTERVAL_MS;
    const nextRunAt =
      enabled && remaining.length
        ? new Date(at.getTime() + Math.max(debounce, minInterval))
        : null;
    const day = seoulDay(at);
    const runCount =
      (doc?.runDay === day ? Number(doc.runCount) || 0 : 0) + (status === "ok" ? 1 : 0);
    return {
      runs,
      enabled,
      nextRunAt,
      pending: {
        events: remaining,
        droppedCount: remaining.length ? Number(doc?.pending?.droppedCount) || 0 : 0,
        firstAt: remaining[0]?.at || null,
        claimedThrough: null,
      },
      consecutiveErrors,
      runDay: day,
      runCount,
      lastRunAt: at,
      lastStatus: status,
      lastResultSummary: summary,
      claimUntil: null,
      claimToken: "",
    };
  }

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
