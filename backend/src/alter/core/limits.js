/** Shared limits. Schedule policy still interprets them. */
export const DEFAULT_TIMEZONE = "Asia/Seoul";
export const MIN_INTERVAL_MS = 60 * 60 * 1000;
export const MAX_SCHEDULES_PER_USER = 5;
export const MAX_RUN_HISTORY = 10;
export const TITLE_MAX = 80;
export const PROMPT_MAX = 2000;
export const SUMMARY_MAX = 280;
export const NOTIFY_MAX = 180;
export const CLAIM_LEASE_MS = 10 * 60 * 1000;
export const EVENT_TYPES = [
  "approval_requested",
  "form_submitted",
  "form_posted",
  "calendar_created",
  "dm_received",
];
export const DEBOUNCE_CHOICES_MS = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];
export const DEFAULT_DEBOUNCE_MS = 15 * 60 * 1000;
export const MAX_EVENT_ROUTINES = 3;
export const MAX_PENDING_EVENTS = 20;
export const MAX_ROUTINE_RUNS_PER_DAY = 6;
export const MAX_USER_EVENT_RUNS_PER_DAY = 12;
export const MAX_CONSECUTIVE_ERRORS = 3;
export const MAX_AGENT_TOOL_STEPS = 3;
export const MAX_TOOL_RESULT_CHARS = 8000;
