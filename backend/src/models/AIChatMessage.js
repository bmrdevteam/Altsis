/**
 * AIChatMessage namespace
 * @namespace Models.AIChatMessage
 * @version 1.0.0
 *
 * @description AI 채팅 메시지
 * | Indexes                       | Properties  |
 * | :-----                        | ----------  |
 * | _id                           | UNIQUE      |
 * | session + createdAt (desc)    |             |
 */
import mongoose from "mongoose";

import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AIChatMessage
 * @typedef TTokenUsage
 *
 * @prop {number?} promptTokens - 프롬프트 토큰 수
 * @prop {number?} candidatesTokens - 응답 토큰 수
 * @prop {number?} totalTokens - 총 토큰 수
 */
const tokenUsageSchema = mongoose.Schema(
  {
    promptTokens: { type: Number },
    candidatesTokens: { type: Number },
    totalTokens: { type: Number },
  },
  { _id: false }
);

/**
 * @memberof Models.AIChatMessage
 * @typedef TAIChatMessage
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} session - AI 채팅 세션 ObjectId
 * @prop {ObjectId} board - 연결된 보드
 * @prop {"student"|"ai"|"teacher"} senderType - 발신자 유형
 * @prop {ObjectId?} sender - 발신자 ObjectId
 * @prop {string?} senderId - 발신자 아이디
 * @prop {string} senderName - 발신자 이름
 * @prop {string} content - 메시지 내용
 * @prop {string} skill - Alter Skill id (chat | syllabus-review …)
 * @prop {TTokenUsage?} tokenUsage - 토큰 사용량
 * @prop {boolean} isDeleted=false - 삭제 여부
 */
const aiChatMessageSchema = mongoose.Schema(
  {
    session: { type: mongoose.Types.ObjectId, required: true },
    board: { type: mongoose.Types.ObjectId, required: true },
    senderType: {
      type: String,
      enum: ["student", "ai", "teacher"],
      required: true,
    },
    sender: { type: mongoose.Types.ObjectId, default: null },
    senderId: { type: String, default: null },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    skill: { type: String, default: "chat" },
    tokenUsage: tokenUsageSchema,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fetching messages by session, ordered by most recent
aiChatMessageSchema.index({ session: 1, createdAt: -1 });

export const AIChatMessage = (dbName) => {
  return conn[dbName].model("AIChatMessage", aiChatMessageSchema);
};
