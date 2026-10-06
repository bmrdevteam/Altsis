/**
 * Per-academy Alter routine. The server runs agent mode as the owner.
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const runSchema = mongoose.Schema(
  {
    at: { type: Date, required: true },
    status: {
      type: String,
      enum: ["ok", "skipped", "error"],
      required: true,
    },
    summary: { type: String, default: "" },
    conversationId: { type: String, default: "" },
    reason: { type: String, default: "" },
    toolNames: { type: [String], default: [] },
    triggerType: { type: String, default: "" },
    eventCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const pendingEventSchema = mongoose.Schema(
  {
    type: { type: String, required: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    actorUserId: { type: String, default: "" },
    formId: { type: String, default: "" },
    boardId: { type: String, default: "" },
    calendarScope: { type: String, default: "" },
    at: { type: Date, required: true },
    title: { type: String, default: "" },
  },
  { _id: false }
);

const alterScheduleSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    school: { type: mongoose.Types.ObjectId },
    season: { type: mongoose.Types.ObjectId, required: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    trigger: {
      type: String,
      enum: ["time", "event"],
      default: "time",
    },
    schedule: {
      kind: {
        type: String,
        enum: ["once", "daily", "weekly"],
      },
      time: String,
      weekdays: [Number],
      onceAt: Date,
    },
    event: {
      types: [String],
      filters: {
        boardIds: [String],
        formIds: [String],
        senderUserIds: [String],
        calendarScope: { type: String, default: "" },
      },
      debounceMs: { type: Number, default: 15 * 60 * 1000 },
      minIntervalMs: { type: Number, default: 60 * 60 * 1000 },
      dmOptIn: { type: Boolean, default: false },
    },
    pending: {
      events: { type: [pendingEventSchema], default: [] },
      droppedCount: { type: Number, default: 0 },
      firstAt: Date,
      claimedThrough: Date,
    },
    runDay: { type: String, default: "" },
    runCount: { type: Number, default: 0 },
    consecutiveErrors: { type: Number, default: 0 },
    timezone: { type: String, default: "Asia/Seoul" },
    enabled: { type: Boolean, default: true },
    nextRunAt: Date,
    lastRunAt: Date,
    lastStatus: {
      type: String,
      enum: ["", "ok", "skipped", "error", "running"],
      default: "",
    },
    lastResultSummary: { type: String, default: "" },
    createdVia: {
      type: String,
      enum: ["settings", "agent"],
      default: "settings",
    },
    proposalKey: { type: String, default: "" },
    claimUntil: Date,
    claimToken: { type: String, default: "" },
    runs: { type: [runSchema], default: [] },
  },
  { timestamps: true }
);

alterScheduleSchema.index({ user: 1, enabled: 1 });
alterScheduleSchema.index({ enabled: 1, nextRunAt: 1, claimUntil: 1 });
alterScheduleSchema.index({ trigger: 1, "event.types": 1, enabled: 1 });
alterScheduleSchema.index(
  { user: 1, proposalKey: 1 },
  { unique: true, partialFilterExpression: { proposalKey: { $gt: "" } } }
);

export const AlterSchedule = (dbName) => {
  return conn[dbName].model("AlterSchedule", alterScheduleSchema);
};
