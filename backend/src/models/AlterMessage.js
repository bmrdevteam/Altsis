/**
 * AlterMessage namespace
 * @namespace Models.AlterMessage
 * @description Navbar Alter 대화 메시지 (텍스트 + review/draft 페이로드)
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const tokenUsageSchema = mongoose.Schema(
  {
    promptTokens: { type: Number },
    candidatesTokens: { type: Number },
    totalTokens: { type: Number },
  },
  { _id: false }
);

const alterMessageSchema = mongoose.Schema(
  {
    conversation: { type: mongoose.Types.ObjectId, required: true },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, default: "" },
    skill: { type: String, default: "chat" },
    review: { type: mongoose.Schema.Types.Mixed, default: null },
    draft: { type: mongoose.Schema.Types.Mixed, default: null },
    tokenUsage: tokenUsageSchema,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

alterMessageSchema.index({ conversation: 1, createdAt: 1 });

export const AlterMessage = (dbName) => {
  return conn[dbName].model("AlterMessage", alterMessageSchema);
};
