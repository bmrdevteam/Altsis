/**
 * CalendarEvent namespace
 * @namespace Models.CalendarEvent
 * @version 1.0.0
 *
 * @description 캘린더 일정
 * | Indexes      | Properties  |
 * | :-----       | ----------  |
 * | _id          | UNIQUE      |
 * | school_1_scope_1 | COMPOUND |
 * | user_1_scope_1   | COMPOUND |
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.CalendarEvent
 * @typedef TCalendarEvent
 *
 * @prop {ObjectId} _id
 * @prop {string} title - 일정 제목
 * @prop {string} description - 일정 설명
 * @prop {Date} start - 시작 일시
 * @prop {Date} end - 종료 일시
 * @prop {boolean} isAllDay - 종일 일정 여부
 * @prop {string} scope - "school" | "personal"
 * @prop {ObjectId} school - school._id (scope=school일 때)
 * @prop {ObjectId} user - 생성자 user._id
 * @prop {Object} recurrence - 반복 설정
 * @prop {string} recurrence.type - "none" | "daily" | "weekly" | "monthly"
 * @prop {Date} recurrence.endDate - 반복 종료일
 * @prop {string} color - 일정 색상
 * @prop {string} sourceType - 일정 출처 유형 ("manual" | "enrollment" | "syllabus")
 * @prop {string} sourceId - 출처 ID (enrollment._id + timeIndex)
 */
const calendarEventSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    isAllDay: { type: Boolean, default: false },
    scope: {
      type: String,
      enum: ["school", "personal"],
      required: true,
    },
    school: { type: mongoose.Types.ObjectId },
    user: { type: mongoose.Types.ObjectId, required: true },
    recurrence: {
      type: mongoose.Schema(
        {
          type: {
            type: String,
            enum: ["none", "daily", "weekly", "monthly"],
            default: "none",
          },
          endDate: { type: Date },
          days: { type: [Number] },
        },
        { _id: false }
      ),
      default: { type: "none" },
    },
    color: { type: String, default: "#4285f4" },
    sourceType: {
      type: String,
      enum: ["manual", "enrollment", "syllabus", "memo"],
      default: "manual",
    },
    sourceId: { type: String },
    syllabusId: { type: mongoose.Types.ObjectId },
    calendarId: { type: mongoose.Types.ObjectId },
  },
  { timestamps: true }
);

calendarEventSchema.index({
  school: 1,
  scope: 1,
});

calendarEventSchema.index({
  user: 1,
  scope: 1,
});

calendarEventSchema.index({
  user: 1,
  sourceType: 1,
  sourceId: 1,
});

calendarEventSchema.index({
  user: 1,
  "recurrence.type": 1,
  start: 1,
  end: 1,
});

calendarEventSchema.index({
  school: 1,
  "recurrence.type": 1,
  start: 1,
  end: 1,
});

export const CalendarEvent = (dbName) => {
  return conn[dbName].model("CalendarEvent", calendarEventSchema);
};
