/**
 * AIChatSession namespace
 * @namespace Models.AIChatSession
 * @version 1.0.0
 *
 * @description AI 채팅 세션
 * | Indexes                       | Properties  |
 * | :-----                        | ----------  |
 * | _id                           | UNIQUE      |
 * | board + student               | UNIQUE      |
 * | board + lastMessageAt (desc)  |             |
 */
import mongoose from "mongoose";

import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AIChatSession
 * @typedef TAIChatSession
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} board - 연결된 보드
 * @prop {ObjectId} student - 학생 ObjectId
 * @prop {string} studentId - 학생 아이디
 * @prop {string} studentName - 학생 이름
 * @prop {boolean} isActive=true - 세션 활성 여부
 * @prop {Date?} lastMessageAt - 마지막 메시지 시간
 * @prop {string?} lastMessagePreview - 마지막 메시지 미리보기
 * @prop {number} messageCount=0 - 메시지 수
 */
const aiChatSessionSchema = mongoose.Schema(
  {
    board: { type: mongoose.Types.ObjectId, required: true },
    student: { type: mongoose.Types.ObjectId, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique index: one session per student per board
aiChatSessionSchema.index({ board: 1, student: 1 }, { unique: true });
// Index for listing sessions by board, ordered by most recent message
aiChatSessionSchema.index({ board: 1, lastMessageAt: -1 });

export const AIChatSession = (dbName) => {
  return conn[dbName].model("AIChatSession", aiChatSessionSchema);
};
