/**
 * AIUsageLog namespace
 * @namespace Models.AIUsageLog
 * @version 1.1.0
 *
 * @description AI 토큰 사용·호출 결과 로그
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const aiUsageLogSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: "unknown",
    },
    model: {
      type: String,
      required: true,
    },
    feature: {
      type: String,
      default: "unknown",
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorCode: {
      type: String,
    },
    promptTokens: {
      type: Number,
      default: 0,
    },
    candidatesTokens: {
      type: Number,
      default: 0,
    },
    thoughtsTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

aiUsageLogSchema.index({ createdAt: 1 });
aiUsageLogSchema.index({ feature: 1, createdAt: -1 });
aiUsageLogSchema.index({ success: 1, createdAt: -1 });

export const AIUsageLog = (dbName) => {
  return conn[dbName].model("AIUsageLog", aiUsageLogSchema);
};
