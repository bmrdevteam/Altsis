/**
 * AIUsageLog namespace
 * @namespace Models.AIUsageLog
 * @version 1.0.0
 *
 * @description AI 토큰 사용 로그
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
    model: {
      type: String,
      required: true,
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

export const AIUsageLog = (dbName) => {
  return conn[dbName].model("AIUsageLog", aiUsageLogSchema);
};
