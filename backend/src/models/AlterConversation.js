/**
 * AlterConversation namespace
 * @namespace Models.AlterConversation
 * @description Navbar Alter 개인 대화 세션 (사용자 × 학기)
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const alterConversationSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    season: { type: mongoose.Types.ObjectId, required: true },
    title: { type: String, default: "새 대화" },
    pageType: {
      type: String,
      enum: ["syllabus-edit", "evaluation", "general", ""],
      default: "general",
    },
    contextLabel: { type: String, default: "" },
    syllabusId: { type: String, default: "" },
    lastSkill: { type: String, default: "chat" },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String, default: "" },
    messageCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["idle", "working", "error"],
      default: "idle",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

alterConversationSchema.index({ user: 1, season: 1, lastMessageAt: -1 });
alterConversationSchema.index({ user: 1, season: 1, isDeleted: 1 });

export const AlterConversation = (dbName) => {
  return conn[dbName].model("AlterConversation", alterConversationSchema);
};
