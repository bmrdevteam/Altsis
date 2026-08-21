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

const alterAttachmentSchema = mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["text", "image"],
      required: true,
    },
    name: { type: String, default: "" },
    key: { type: String, default: "" },
    mimeType: { type: String, default: "" },
  },
  { _id: false }
);

const alterGuideLinkSchema = mongoose.Schema(
  {
    kind: { type: String, enum: ["page", "guide"] },
    title: { type: String, default: "" },
    path: { type: String, default: "" },
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
    /** 유저 메시지 첨부 메타(이미지 S3 key 등). 미리보기는 조회 시 signed URL로 채움 */
    attachments: { type: [alterAttachmentSchema], default: [] },
    review: { type: mongoose.Schema.Types.Mixed, default: null },
    draft: { type: mongoose.Schema.Types.Mixed, default: null },
    /** 제품 안내 답 아래 화면/가이드 바로가기 */
    links: { type: [alterGuideLinkSchema], default: [] },
    tokenUsage: tokenUsageSchema,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

alterMessageSchema.index({ conversation: 1, createdAt: 1 });

export const AlterMessage = (dbName) => {
  return conn[dbName].model("AlterMessage", alterMessageSchema);
};
