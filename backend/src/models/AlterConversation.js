/**
 * AlterConversation namespace
 * @namespace Models.AlterConversation
 * @description Navbar Alter 개인 대화 세션 (사용자 × 학교, season은 최근 사용 학기 메타)
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const alterConversationSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    school: { type: mongoose.Types.ObjectId },
    /** 최근 사용한 학기 (목록 필터가 아님 — 실행 문맥/표시용) */
    season: { type: mongoose.Types.ObjectId, required: true },
    title: { type: String, default: "새 대화" },
    /** 사용자가 직접 이름을 바꾼 경우 — contextLabel로 title을 덮어쓰지 않음 */
    titleCustom: { type: Boolean, default: false },
    pageType: {
      type: String,
      enum: [
        "syllabus-edit",
        "evaluation",
        "archive",
        "document",
        "form-response",
        "activity",
        "form-editor",
        "assessment-grade",
        "guide",
        "general",
        "",
      ],
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

alterConversationSchema.index({ user: 1, school: 1, lastMessageAt: -1 });
alterConversationSchema.index({ user: 1, season: 1, lastMessageAt: -1 });
alterConversationSchema.index({ user: 1, school: 1, isDeleted: 1 });

export const AlterConversation = (dbName) => {
  return conn[dbName].model("AlterConversation", alterConversationSchema);
};
