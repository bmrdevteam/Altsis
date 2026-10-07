/**
 * Queue event-triggered Alter routines.
 * Idle routines keep nextRunAt null. The existing minute claim runs them.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { Academy, AlterSchedule, Registration } from "../models/index.js";
import { logger } from "../log/logger.js";
import { isScheduleTeacher } from "../alter/policy/access.js";
import {
  DEFAULT_DEBOUNCE_MS,
  MAX_PENDING_EVENTS,
  MIN_INTERVAL_MS,
} from "./alterScheduleTime.js";

const alterRunStore = new AsyncLocalStorage();

export const isInAlterRun = () => alterRunStore.getStore()?.inAlterRun === true;

export const runWithAlterFlag = (fn) => alterRunStore.run({ inAlterRun: true }, fn);

const BLOCKED_ENTITY = new Set(["alterConversation", "alterSchedule"]);
const BLOCKED_NOTIFY = new Set(["alterSchedule", "alterTrigger"]);

const sameId = (a, b) => {
  if (a == null || b == null || a === "" || b === "") return false;
  return String(a) === String(b);
};

export const clipEventTitle = (value) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);

const clipId = (value) => String(value || "").trim().slice(0, 64);

export const sanitizePendingEvent = (evt, now = new Date()) => {
  const scope = String(evt?.calendarScope || "");
  return {
    type: String(evt?.type || ""),
    entityType: String(evt?.entityType || ""),
    entityId: clipId(evt?.entityId),
    actorUserId: clipId(evt?.actorUserId),
    formId: clipId(evt?.formId),
    boardId: clipId(evt?.boardId),
    calendarScope: scope === "school" || scope === "personal" ? scope : "",
    at: evt?.at instanceof Date ? evt.at : now,
    title: clipEventTitle(evt?.title),
    ...(clipEventTitle(evt?.formName) ? { formName: clipEventTitle(evt.formName) } : {}),
    ...(clipEventTitle(evt?.boardName) ? { boardName: clipEventTitle(evt.boardName) } : {}),
    ...(evt?.kind === "approval" || evt?.kind === "submission" || evt?.kind === "post"
      ? { kind: evt.kind }
      : {}),
  };
};

/**
 * Pure batching step. The Mongo pipeline in buildPendingPipeline matches this.
 */
export const previewPending = (routine, evt, now = new Date()) => {
  const pending = routine?.pending || {};
  const events = Array.isArray(pending.events) ? [...pending.events] : [];
  const wasEmpty = events.length === 0;
  const droppedCount =
    (Number(pending.droppedCount) || 0) + (events.length >= MAX_PENDING_EVENTS ? 1 : 0);
  events.push(sanitizePendingEvent(evt, now));
  const debounce = routine?.event?.debounceMs || DEFAULT_DEBOUNCE_MS;
  const minInterval = routine?.event?.minIntervalMs || MIN_INTERVAL_MS;
  const last = routine?.lastRunAt ? new Date(routine.lastRunAt).getTime() : 0;
  const nextRunAt = wasEmpty
    ? new Date(Math.max(now.getTime() + debounce, last + minInterval))
    : routine?.nextRunAt || null;
  return {
    ...routine,
    pending: {
      events: events.slice(-MAX_PENDING_EVENTS),
      droppedCount,
      firstAt: wasEmpty ? now : pending.firstAt || now,
      claimedThrough: pending.claimedThrough || null,
    },
    nextRunAt,
  };
};

export const buildPendingPipeline = (eventDoc, now = new Date()) => [
  {
    $set: {
      _pendingSize: { $size: { $ifNull: ["$pending.events", []] } },
    },
  },
  {
    $set: {
      "pending.droppedCount": {
        $add: [
          { $ifNull: ["$pending.droppedCount", 0] },
          { $cond: [{ $gte: ["$_pendingSize", MAX_PENDING_EVENTS] }, 1, 0] },
        ],
      },
      "pending.firstAt": {
        $cond: [
          { $gt: ["$_pendingSize", 0] },
          { $ifNull: ["$pending.firstAt", now] },
          now,
        ],
      },
      "pending.events": {
        $slice: [
          { $concatArrays: [{ $ifNull: ["$pending.events", []] }, [eventDoc]] },
          -MAX_PENDING_EVENTS,
        ],
      },
      nextRunAt: {
        $cond: [
          { $gt: ["$_pendingSize", 0] },
          "$nextRunAt",
          {
            $max: [
              { $add: [now, { $ifNull: ["$event.debounceMs", DEFAULT_DEBOUNCE_MS] }] },
              {
                $add: [
                  { $ifNull: ["$lastRunAt", new Date(0)] },
                  { $ifNull: ["$event.minIntervalMs", MIN_INTERVAL_MS] },
                ],
              },
            ],
          },
        ],
      },
    },
  },
  { $unset: "_pendingSize" },
];

export const routineMatchesEvent = (routine, evt) => {
  if (!routine || routine.enabled === false || routine.trigger !== "event") return false;
  const types = routine.event?.types || [];
  if (!types.includes(evt?.type)) return false;
  if (sameId(evt.actorUserId, routine.user) || sameId(evt.actorUserId, routine.userId)) {
    return false;
  }
  if (
    evt.recipientUserId &&
    !sameId(evt.recipientUserId, routine.user) &&
    !sameId(evt.recipientUserId, routine.userId)
  ) {
    return false;
  }
  if (Array.isArray(evt.recipientUserIds) && evt.recipientUserIds.length) {
    const ids = evt.recipientUserIds.map(String);
    if (!ids.includes(String(routine.user)) && !ids.includes(String(routine.userId))) {
      return false;
    }
  }
  const filters = routine.event?.filters || {};
  if (filters.boardIds?.length) {
    if (!evt.boardId || !filters.boardIds.map(String).includes(String(evt.boardId))) return false;
  }
  if (filters.formIds?.length) {
    if (!evt.formId || !filters.formIds.map(String).includes(String(evt.formId))) return false;
  }
  if (evt.type === "dm_received") {
    if (routine.event?.dmOptIn !== true) return false;
    if (filters.senderUserIds?.length) {
      const sender = evt.senderUserId || evt.actorUserId;
      if (!filters.senderUserIds.map(String).includes(String(sender || ""))) return false;
    }
  }
  if (evt.type === "calendar_created") {
    if (evt.calendarScope === "personal") return false;
    const scope = filters.calendarScope;
    if (scope && scope !== "all" && scope !== evt.calendarScope) return false;
  }
  return true;
};

const eventIsBlocked = (evt) => {
  if (!evt?.type) return true;
  if (BLOCKED_NOTIFY.has(evt.notificationType) || BLOCKED_NOTIFY.has(evt.type)) return true;
  if (BLOCKED_ENTITY.has(evt.entityType)) return true;
  return false;
};

export const enqueueAlterEvent = async (academyId, evt, deps = {}) => {
  if (isInAlterRun()) return { queued: 0, reason: "in-run" };
  if (eventIsBlocked(evt)) return { queued: 0, reason: "blocked" };
  const academy = deps.findAcademy
    ? await deps.findAcademy(academyId)
    : await Academy.findOne({ academyId }).select("alterEventTriggersEnabled").lean();
  if (!academy?.alterEventTriggersEnabled) return { queued: 0, reason: "disabled" };
  const routines = deps.findRoutines
    ? await deps.findRoutines(evt)
    : await AlterSchedule(academyId)
        .find({ enabled: true, trigger: "event", "event.types": evt.type })
        .lean();
  const isTeacher =
    deps.isTeacher ||
    (async (routine) => {
      const reg = await Registration(academyId)
        .findOne({ season: routine.season, user: routine.user })
        .select("role")
        .lean();
      return isScheduleTeacher(routine, reg);
    });
  const canQueue =
    deps.canQueue ||
    (async (routine, event) => {
      const { canQueueEvent } = await import("./alterEventAccess.js");
      return canQueueEvent(academyId, routine, event);
    });
  const apply =
    deps.apply ||
    (async (routine, event, now) => {
      const eventDoc = sanitizePendingEvent(event, now);
      await AlterSchedule(academyId).findOneAndUpdate(
        { _id: routine._id, enabled: true, trigger: "event" },
        buildPendingPipeline(eventDoc, now)
      );
    });
  const now = deps.now instanceof Date ? deps.now : new Date();
  let queued = 0;
  for (const routine of routines || []) {
    if (!routineMatchesEvent(routine, evt)) continue;
    if (!(await isTeacher(routine))) continue;
    if (!(await canQueue(routine, evt))) continue;
    await apply(routine, evt, now);
    queued += 1;
  }
  return { queued };
};

/** Fire-and-forget. Callers keep their own write even if queueing fails. */
export const emitAlterEvent = (academyId, evt) => {
  void enqueueAlterEvent(academyId, evt).catch((err) => {
    logger.error(`alter event emit failed: ${err.message}`);
  });
};
