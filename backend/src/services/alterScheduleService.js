/**
 * Teacher-owned Alter routines. Students cannot create or own one.
 * Chat proposals are saved only through confirmProposal.
 */

import mongoose from "mongoose";
import { AlterSchedule, Registration, Season } from "../models/index.js";
import { PERMISSION_DENIED } from "../messages/index.js";
import {
  CLAIM_LEASE_MS,
  MAX_SCHEDULES_PER_USER,
  buildScheduleFields,
  claimQuery,
  scheduleError,
} from "./alterScheduleTime.js";

const claimToken = (now) =>
  `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`;

const modelOf = (academyId, model) => model || AlterSchedule(academyId);

export const isScheduleTeacher = (_user, registration) =>
  registration?.role === "teacher";

export const assertScheduleTeacher = async (academyId, user, seasonId, deps = {}) => {
  if (!seasonId) {
    throw scheduleError(400, "학기가 필요합니다.", "FIELD_REQUIRED");
  }
  const season = deps.findSeason
    ? await deps.findSeason(seasonId)
    : await Season(academyId).findById(seasonId).select("school");
  if (!season) {
    throw scheduleError(404, "학기를 찾을 수 없습니다.", "SEASON_NOT_FOUND");
  }
  const registration = deps.findRegistration
    ? await deps.findRegistration(seasonId, user._id)
    : await Registration(academyId).findOne({
        season: seasonId,
        user: user._id,
      });
  if (!isScheduleTeacher(user, registration)) {
    throw scheduleError(
      403,
      "예약 실행은 선생님만 사용할 수 있습니다.",
      PERMISSION_DENIED
    );
  }
  return { season, registration };
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

export const listSchedulesForUser = async (academyId, user, seasonId) => {
  await assertScheduleTeacher(academyId, user, seasonId);
  const rows = await AlterSchedule(academyId)
    .find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(MAX_SCHEDULES_PER_USER + 5)
    .lean();
  return rows;
};

const countOwned = async (Model, userId) => Model.countDocuments({ user: userId });

const insertSchedule = async (Model, user, fields, createdVia, season) => {
  const owned = await countOwned(Model, user._id);
  if (owned >= MAX_SCHEDULES_PER_USER) {
    throw scheduleError(
      400,
      `예약은 계정당 ${MAX_SCHEDULES_PER_USER}개까지입니다.`,
      "SCHEDULE_LIMIT"
    );
  }
  const doc = await Model.create({
    user: user._id,
    userId: user.userId,
    school: season.school || undefined,
    season: season._id,
    title: fields.title,
    prompt: fields.prompt,
    schedule: fields.schedule,
    timezone: fields.timezone,
    enabled: true,
    nextRunAt: fields.nextRunAt,
    lastStatus: "",
    lastResultSummary: "",
    createdVia,
    runs: [],
  });
  return publicSchedule(doc);
};

export const createScheduleForUser = async (
  academyId,
  user,
  body,
  createdVia = "settings"
) => {
  const seasonId = body?.season || body?.seasonId;
  const { season } = await assertScheduleTeacher(academyId, user, seasonId);
  const fields = buildScheduleFields(body);
  return insertSchedule(AlterSchedule(academyId), user, fields, createdVia, season);
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

export const updateScheduleForUser = async (academyId, user, id, body) => {
  const doc = await findOwnedSchedule(academyId, user, id);
  await assertScheduleTeacher(academyId, user, doc.season);
  const merged = {
    title: body?.title != null ? body.title : doc.title,
    prompt: body?.prompt != null ? body.prompt : doc.prompt,
    timezone: body?.timezone != null ? body.timezone : doc.timezone,
    schedule: body?.schedule != null ? body.schedule : doc.schedule,
  };
  const fields = buildScheduleFields(merged);
  doc.title = fields.title;
  doc.prompt = fields.prompt;
  doc.schedule = fields.schedule;
  doc.timezone = fields.timezone;
  doc.nextRunAt = fields.nextRunAt;
  if (typeof body?.enabled === "boolean") doc.enabled = body.enabled;
  await doc.save();
  return publicSchedule(doc);
};

export const setScheduleEnabled = async (academyId, user, id, enabled) => {
  const doc = await findOwnedSchedule(academyId, user, id);
  await assertScheduleTeacher(academyId, user, doc.season);
  doc.enabled = !!enabled;
  await doc.save();
  return publicSchedule(doc);
};

export const deleteScheduleForUser = async (academyId, user, id) => {
  const doc = await findOwnedSchedule(academyId, user, id);
  await assertScheduleTeacher(academyId, user, doc.season);
  await doc.deleteOne();
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
  });
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

export const beginManualRun = async (academyId, user, id) => {
  const doc = await findOwnedSchedule(academyId, user, id);
  await assertScheduleTeacher(academyId, user, doc.season);
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
