/**
 * UserCalendar namespace
 * @namespace Models.UserCalendar
 * @version 1.0.0
 *
 * @description 사용자 캘린더 (캘린더 그룹)
 * | Indexes          | Properties  |
 * | :-----           | ----------  |
 * | _id              | UNIQUE      |
 * | user_1           | INDEX       |
 * | user_1_school_1  | COMPOUND    |
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.UserCalendar
 * @typedef TUserCalendar
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - 소유자 user._id
 * @prop {ObjectId} school - 학교 (scope=school일 때)
 * @prop {string} name - 캘린더 이름
 * @prop {string} color - 캘린더 색상
 * @prop {string} scope - "school" | "personal"
 * @prop {boolean} isDefault - 기본 캘린더 여부 (삭제 불가)
 * @prop {boolean} isPrivate - 본인만 보기 (타인 일정 조회에서 숨김, personal만)
 */
const userCalendarSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    school: { type: mongoose.Types.ObjectId },
    name: { type: String, required: true },
    color: { type: String, default: "#4285f4" },
    scope: {
      type: String,
      enum: ["school", "personal"],
      default: "personal",
    },
    isDefault: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userCalendarSchema.index({ user: 1 });
userCalendarSchema.index({ user: 1, school: 1 });

export const UserCalendar = (dbName) => {
  return conn[dbName].model("UserCalendar", userCalendarSchema);
};
