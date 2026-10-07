/**
 * Teacher-owned Alter routines. Students cannot create or own one.
 * Chat proposals are saved only through confirmProposal.
 */

import mongoose from "mongoose";
import { AlterSchedule } from "../models/index.js";
import {
  isScheduleTeacher,
  resolveAlterContext,
} from "../alter/policy/access.js";
import {
  CLAIM_LEASE_MS,
  DEFAULT_DEBOUNCE_MS,
  MAX_EVENT_ROUTINES,
  MAX_SCHEDULES_PER_USER,
  MIN_INTERVAL_MS,
  buildScheduleFields,
  claimQuery,
  computeNextRunAt,
  scheduleError,
} from "./alterScheduleTime.js";

const claimToken = (now) =>
  `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`;

const modelOf = (academyId, model) => model || AlterSchedule(academyId);

export { isScheduleTeacher };

export const scheduleModelFor = (academyId) => AlterSchedule(academyId);

export const assertScheduleTeacher = async (academyId, user, seasonId, deps = {}) => {
  const ctx = await resolveAlterContext(academyId, user, seasonId, {
    runner: "schedule",
    deps,
    requireRole: true,
  });
  return { season: ctx.season, registration: ctx.registration };
};

const asId = (value) => {
  const text = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(text)) return null;
  return text;
};

const publicSchedule = (doc) => {
  const row = doc?.toObject ? doc.toObject() : { ...doc };
  return row;
};

/** Owners can list rows after they stop being teachers, so they can turn them off. */
export const listSchedulesForUser = async (academyId, user) => {
  const rows = await AlterSchedule(academyId)
    .find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(MAX_SCHEDULES_PER_USER + 5)
    .lean();
  return rows;
};

const countOwned = async (Model, userId) => Model.countDocuments({ user: userId });

const limitError = () =>
  scheduleError(
    400,
    `예약은 계정당 ${MAX_SCHEDULES_PER_USER}개까지입니다.`,
    "SCHEDULE_LIMIT"
  );

const duplicateError = () =>
  scheduleError(409, "같은 예약이 이미 있습니다.", "SCHEDULE_DUPLICATE");

const eventLimitError = () =>
  scheduleError(
    400,
    `이벤트 예약은 계정당 ${MAX_EVENT_ROUTINES}개까지입니다.`,
    "EVENT_LIMIT"
  );

const findByProposalKey = async (Model, userId, proposalKey) => {
  if (!proposalKey || typeof Model.findOne !== "function") return null;
  return Model.findOne({ user: userId, proposalKey });
};

/**
 * Count-then-create loses parallel inserts. Insert, then keep the row only
 * if it is still inside the oldest five for this user. Each request deletes
 * only the document it just wrote.
 */
const insertSchedule = async (Model, user, fields, createdVia, season) => {
  const proposalKey = fields.proposalKey || "";
  const existing = await findByProposalKey(Model, user._id, proposalKey);
  if (existing) {
    if (createdVia === "agent") return publicSchedule(existing);
    throw duplicateError();
  }
  if (typeof Model.countDocuments === "function") {
    const owned = await countOwned(Model, user._id);
    if (owned >= MAX_SCHEDULES_PER_USER) throw limitError();
    if (fields.trigger === "event") {
      const eventOwned = await Model.countDocuments({ user: user._id, trigger: "event" });
      if (eventOwned >= MAX_EVENT_ROUTINES) throw eventLimitError();
    }
  }
  let doc;
  try {
    doc = await Model.create({
      user: user._id,
      userId: user.userId,
      school: season.school || undefined,
      season: season._id,
      title: fields.title,
      prompt: fields.prompt,
      ...(fields.schedule ? { schedule: fields.schedule } : {}),
      trigger: fields.trigger || "time",
      ...(fields.event ? { event: fields.event } : {}),
      timezone: fields.timezone,
      enabled: true,
      nextRunAt: fields.nextRunAt,
      lastStatus: "",
      lastResultSummary: "",
      createdVia,
      proposalKey,
      runs: [],
      pending: { events: [], droppedCount: 0 },
      runCount: 0,
      consecutiveErrors: 0,
    });
  } catch (err) {
    if (err?.code === 11000 && proposalKey) {
      const raced = await findByProposalKey(Model, user._id, proposalKey);
      if (raced && createdVia === "agent") return publicSchedule(raced);
      throw duplicateError();
    }
    throw err;
  }
  if (typeof Model.find === "function") {
    const rows = await Model.find({ user: user._id })
      .sort({ createdAt: 1, _id: 1 })
      .select("_id")
      .lean();
    const index = rows.findIndex((row) => String(row._id) === String(doc._id));
    if (index < 0 || index >= MAX_SCHEDULES_PER_USER) {
      if (typeof doc.deleteOne === "function") await doc.deleteOne();
      else if (typeof Model.deleteOne === "function") {
        await Model.deleteOne({ _id: doc._id, user: user._id });
      }
      throw limitError();
    }
  }
  if (fields.trigger === "event" && typeof Model.find === "function") {
    const rows = await Model.find({ user: user._id, trigger: "event" })
      .sort({ createdAt: 1, _id: 1 })
      .select("_id")
      .lean();
    const index = rows.findIndex((row) => String(row._id) === String(doc._id));
    if (index < 0 || index >= MAX_EVENT_ROUTINES) {
      if (typeof doc.deleteOne === "function") await doc.deleteOne();
      else if (typeof Model.deleteOne === "function") {
        await Model.deleteOne({ _id: doc._id, user: user._id });
      }
      throw eventLimitError();
    }
  }
  return publicSchedule(doc);
};

const gateScheduleWrite = async (academyId, user, seasonId, fields, deps, owned) => {
  await resolveAlterContext(academyId, user, seasonId, {
    runner: "schedule",
    deps,
    requireRole: !owned,
    requireAi: true,
    requireEventTriggers: fields?.trigger === "event",
    owned,
  });
};

export const createScheduleForUser = async (
  academyId,
  user,
  body,
  createdVia = "settings",
  deps = {}
) => {
  const seasonId = body?.season || body?.seasonId;
  const { season } = await assertScheduleTeacher(academyId, user, seasonId, deps);
  const fields = buildScheduleFields(body);
  await gateScheduleWrite(academyId, user, seasonId, fields, deps);
  const Model = deps.model || AlterSchedule(academyId);
  return insertSchedule(Model, user, fields, createdVia, season);
};

export const findOwnedSchedule = async (academyId, user, id, model) => {
  const scheduleId = String(id || "").trim();
  if (!model && !asId(scheduleId)) {
    throw scheduleError(404, "예약을 찾을 수 없습니다.", "NOT_FOUND");
  }
  if (!scheduleId) {
    throw scheduleError(404, "예약을 찾을 수 없습니다.", "NOT_FOUND");
  }
  const Model = modelOf(academyId, model);
  const doc = await Model.findOne({ _id: scheduleId, user: user._id });
  if (!doc) {
    throw scheduleError(404, "예약을 찾을 수 없습니다.", "NOT_FOUND");
  }
  return doc;
};

export const updateScheduleForUser = async (academyId, user, id, body, model, deps = {}) => {
  const doc = await findOwnedSchedule(academyId, user, id, model);
  const merged = {
    title: body?.title != null ? body.title : doc.title,
    prompt: body?.prompt != null ? body.prompt : doc.prompt,
    timezone: body?.timezone != null ? body.timezone : doc.timezone,
    trigger: body?.trigger || doc.trigger || "time",
    schedule: body?.schedule != null ? body.schedule : doc.schedule,
    event: body?.event != null ? body.event : doc.event,
  };
  const fields = buildScheduleFields(merged);
  await gateScheduleWrite(
    academyId,
    user,
    doc.season || body?.season || body?.seasonId,
    fields,
    deps,
    doc
  );
  doc.title = fields.title;
  doc.prompt = fields.prompt;
  doc.trigger = fields.trigger || "time";
  if (fields.schedule) doc.schedule = fields.schedule;
  if (fields.event) doc.event = fields.event;
  doc.timezone = fields.timezone;
  doc.nextRunAt = fields.nextRunAt;
  doc.proposalKey = fields.proposalKey;
  if (typeof body?.enabled === "boolean") doc.enabled = body.enabled;
  try {
    await doc.save();
  } catch (err) {
    if (err?.code === 11000) throw duplicateError();
    throw err;
  }
  return publicSchedule(doc);
};

export const setScheduleEnabled = async (academyId, user, id, enabled, model, deps = {}) => {
  const doc = await findOwnedSchedule(academyId, user, id, model);
  const on = !!enabled;
  if (on) {
    await gateScheduleWrite(
      academyId,
      user,
      doc.season,
      { trigger: doc.trigger || "time" },
      deps,
      doc
    );
  }
  if (on && (doc.trigger || "time") === "event") {
    const pending = doc.pending?.events?.length || doc.pending?.events?.size || 0;
    if (pending) {
      const wait = Math.max(
        doc.event?.debounceMs || DEFAULT_DEBOUNCE_MS,
        doc.event?.minIntervalMs || MIN_INTERVAL_MS
      );
      doc.nextRunAt = new Date(Date.now() + wait);
    } else {
      doc.nextRunAt = null;
    }
  } else if (on) {
    const spec = doc.schedule?.toObject ? doc.schedule.toObject() : { ...(doc.schedule || {}) };
    const next = computeNextRunAt(
      { ...spec, timezone: doc.timezone || "Asia/Seoul" },
      new Date()
    );
    if (!next) {
      throw scheduleError(400, "이미 지난 한 번 예약은 다시 켤 수 없습니다.");
    }
    doc.nextRunAt = next;
  }
  doc.enabled = on;
  if (typeof doc.save === "function") await doc.save();
  return publicSchedule(doc);
};

export const deleteScheduleForUser = async (academyId, user, id, model) => {
  const doc = await findOwnedSchedule(academyId, user, id, model);
  if (typeof doc.deleteOne === "function") await doc.deleteOne();
  else if (typeof model?.deleteOne === "function") {
    await model.deleteOne({ _id: doc._id, user: user._id });
  }
  return { deleted: true, id: String(doc._id) };
};

/**
 * The model proposes. This runs only after the signed-in teacher confirms.
 * Identity is req.user, never a field on the proposal.
 */
export const confirmProposal = async (academyId, user, body, deps = {}) => {
  const proposal = body?.proposal;
  const seasonId = body?.season || body?.seasonId;
  const { season } = await assertScheduleTeacher(academyId, user, seasonId, deps);
  if (!proposal || proposal.saved === true) {
    throw scheduleError(400, "저장할 제안이 없습니다.");
  }
  const Model = deps.model || AlterSchedule(academyId);
  if (proposal.action === "delete") {
    const doc = await findOwnedSchedule(academyId, user, proposal.scheduleId, Model);
    if (doc.deleteOne) await doc.deleteOne();
    else if (Model.deleteOne) await Model.deleteOne({ _id: doc._id, user: user._id });
    return { deleted: true, id: String(doc._id) };
  }
  if (proposal.action !== "create") {
    throw scheduleError(400, "저장할 제안이 없습니다.");
  }
  const fields = buildScheduleFields({
    title: proposal.title,
    prompt: proposal.prompt,
    timezone: proposal.timezone,
    schedule: proposal.schedule,
    trigger: proposal.trigger,
    event: proposal.event,
  });
  await gateScheduleWrite(academyId, user, seasonId, fields, deps);
  return insertSchedule(Model, user, fields, "agent", season);
};

export const listSchedulesForTool = async (serverCtx) => {
  const academyId = serverCtx?.academyId;
  const user = serverCtx?.user;
  const seasonId = String(serverCtx?.seasonId || serverCtx?.season?._id || "");
  if (!academyId || !user) {
    return { summary: "예약 없음", saved: false, schedules: [] };
  }
  try {
    await assertScheduleTeacher(academyId, user, seasonId);
  } catch (err) {
    return {
      summary: "예약을 볼 수 없음",
      saved: false,
      error: err.message,
      schedules: [],
    };
  }
  const rows = await AlterSchedule(academyId)
    .find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(MAX_SCHEDULES_PER_USER)
    .select("title prompt schedule timezone enabled nextRunAt lastStatus lastRunAt")
    .lean();
  return {
    summary: rows.length ? `예약 ${rows.length}건` : "예약 없음",
    saved: false,
    schedules: rows.map((row) => ({
      scheduleId: String(row._id),
      title: row.title,
      prompt: row.prompt,
      schedule: row.schedule,
      timezone: row.timezone,
      enabled: row.enabled,
      nextRunAt: row.nextRunAt,
      lastStatus: row.lastStatus || "",
    })),
  };
};

export const beginManualRun = async (academyId, user, id, seasonId, deps = {}) => {
  await assertScheduleTeacher(academyId, user, seasonId, deps);
  const doc = await findOwnedSchedule(academyId, user, id, deps.model);
  const now = new Date();
  const token = claimToken(now);
  const previous = await AlterSchedule(academyId).findOneAndUpdate(
    {
      _id: doc._id,
      user: user._id,
      $or: [
        { claimUntil: null },
        { claimUntil: { $exists: false } },
        { claimUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        claimUntil: new Date(now.getTime() + CLAIM_LEASE_MS),
        claimToken: token,
        lastStatus: "running",
        "pending.claimedThrough": now,
      },
    },
    { new: false }
  );
  if (!previous) {
    throw scheduleError(409, "이미 실행 중입니다.", "SCHEDULE_RUNNING");
  }
  const pre = previous.toObject ? previous.toObject() : previous;
  return {
    ...pre,
    claimUntil: new Date(now.getTime() + CLAIM_LEASE_MS),
    claimToken: token,
    lastStatus: "running",
    pending: { ...(pre.pending || {}), claimedThrough: now },
  };
};

export const claimDueDocument = async (model, now, leaseMs = CLAIM_LEASE_MS) => {
  const token = claimToken(now);
  const previous = await model.findOneAndUpdate(
    claimQuery(now),
    {
      $set: {
        claimUntil: new Date(now.getTime() + leaseMs),
        claimToken: token,
        lastStatus: "running",
        "pending.claimedThrough": now,
      },
    },
    { new: false, sort: { nextRunAt: 1 } }
  );
  if (!previous) return null;
  const pre = previous.toObject ? previous.toObject() : previous;
  return {
    ...pre,
    claimUntil: new Date(now.getTime() + leaseMs),
    claimToken: token,
    lastStatus: "running",
    pending: { ...(pre.pending || {}), claimedThrough: now },
  };
};

export const releaseClaimToken = async (model, doc) => {
  if (!doc?._id || !doc?.claimToken) return;
  await model.updateOne(
    { _id: doc._id, claimToken: doc.claimToken },
    {
      $set: {
        claimUntil: null,
        claimToken: "",
        lastStatus: doc.lastStatus === "running" ? "" : doc.lastStatus || "",
      },
    }
  );
};

export { MAX_SCHEDULES_PER_USER };
