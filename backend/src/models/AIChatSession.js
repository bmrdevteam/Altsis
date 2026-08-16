/**
 * AIChatSession namespace
 * @namespace Models.AIChatSession
 * @version 1.1.0
 *
 * @description AI 채팅 세션 (양식 aiChat 항목: form + fieldId + row)
 * | Indexes                       | Properties  |
 * | :-----                        | ----------  |
 * | _id                           | UNIQUE      |
 * | form + fieldId + row          | UNIQUE sparse |
 * | form + lastMessageAt (desc)   |             |
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
 * @prop {ObjectId} [form] - 양식 (aiChat 항목)
 * @prop {string} [fieldId] - 양식 필드 _id
 * @prop {ObjectId} [row] - AltSheetRow._id
 * @prop {ObjectId} student - 학생 ObjectId
 * @prop {string} studentId - 학생 아이디
 * @prop {string} studentName - 학생 이름
 * @prop {boolean} isActive=true - 세션 활성 여부
 * @prop {Date?} lastMessageAt - 마지막 메시지 시간
 * @prop {string?} lastMessagePreview - 마지막 메시지 미리보기
 * @prop {number} messageCount=0 - 메시지 수
 * @prop {number} studentMessageCount=0 - 학생 메시지 수
 */
const aiChatSessionSchema = mongoose.Schema(
  {
    board: { type: mongoose.Types.ObjectId, required: true },
    form: { type: mongoose.Types.ObjectId },
    fieldId: { type: String },
    row: { type: mongoose.Types.ObjectId },
    student: { type: mongoose.Types.ObjectId, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String },
    messageCount: { type: Number, default: 0 },
    studentMessageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiChatSessionSchema.index(
  { form: 1, fieldId: 1, row: 1 },
  { unique: true, sparse: true }
);
aiChatSessionSchema.index({ form: 1, lastMessageAt: -1 });
aiChatSessionSchema.index({ board: 1, lastMessageAt: -1 });
/** 보드 Alter 전용(form 없음). 양식 aiChat 세션과 분리 */
aiChatSessionSchema.index(
  { board: 1, student: 1 },
  {
    unique: true,
    name: "board_1_student_1_board_alter",
    partialFilterExpression: { form: { $exists: false } },
  }
);

export const AIChatSession = (dbName) => {
  const existing = conn[dbName].models.AIChatSession;
  if (existing) return existing;
  const model = conn[dbName].model("AIChatSession", aiChatSessionSchema);
  // 구 unique(board+student)는 양식 세션과 충돌하므로 제거
  model.collection.dropIndex("board_1_student_1").catch(() => {});
  return model;
};
