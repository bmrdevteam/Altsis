/**
 * Reminder namespace
 * @namespace Models.Reminder
 * @version 1.0.0
 *
 * @description 사용자 리마인더
 * | Indexes                              | Properties  |
 * | :-----                               | ----------  |
 * | _id                                  | UNIQUE      |
 * | user_1_completed_1_reminderTime_1    | COMPOUND    |
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Reminder
 * @typedef TReminder
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {string} title - 리마인더 제목
 * @prop {string} memo - 메모
 * @prop {Date} reminderTime - 알림 시각
 * @prop {boolean} completed - 완료 여부
 * @prop {boolean} notified - 알림 발송 여부
 */
const reminderSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    title: { type: String, required: true },
    memo: { type: String, default: "" },
    reminderTime: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reminderSchema.index({
  user: 1,
  completed: 1,
  reminderTime: 1,
});

// 스케줄러: 미처리 리마인더 조회 최적화 (user 없이)
reminderSchema.index({
  completed: 1,
  notified: 1,
  reminderTime: 1,
});

export const Reminder = (dbName) => {
  return conn[dbName].model("Reminder", reminderSchema);
};
