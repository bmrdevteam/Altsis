import { createHash } from "crypto";
import { DEFAULT_DEBOUNCE_MS, DEFAULT_TIMEZONE, MIN_INTERVAL_MS } from "./limits.js";

/** Same title, prompt, and slot confirm as one schedule. */
export const scheduleIdentityKey = (fields) => {
  const schedule = fields?.schedule || {};
  const weekdays = Array.isArray(schedule.weekdays) ? [...schedule.weekdays] : [];
  const onceAt = schedule.onceAt ? new Date(schedule.onceAt).toISOString() : "";
  const event = fields?.event || {};
  const filters = event.filters || {};
  const payload =
    fields?.trigger === "event"
      ? JSON.stringify({
          title: String(fields?.title || "").trim(),
          prompt: String(fields?.prompt || "").trim(),
          timezone: fields?.timezone || DEFAULT_TIMEZONE,
          trigger: "event",
          types: Array.isArray(event.types) ? [...event.types].sort() : [],
          debounceMs: event.debounceMs || DEFAULT_DEBOUNCE_MS,
          minIntervalMs: event.minIntervalMs || MIN_INTERVAL_MS,
          dmOptIn: event.dmOptIn === true,
          boardIds: [...(filters.boardIds || [])].map(String).sort(),
          formIds: [...(filters.formIds || [])].map(String).sort(),
          senderUserIds: [...(filters.senderUserIds || [])].map(String).sort(),
          calendarScope: filters.calendarScope || "",
        })
      : JSON.stringify({
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

export const slotKey = (academyId, doc) => {
  const when = new Date(doc?.nextRunAt).toISOString();
  return `scheduler:dedup:alter-schedule:${academyId}:${doc?._id}:${when}`;
};
