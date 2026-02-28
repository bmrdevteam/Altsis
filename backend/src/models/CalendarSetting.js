/**
 * CalendarSetting namespace
 * @namespace Models.CalendarSetting
 * @version 1.0.0
 *
 * @description 사용자 캘린더 설정
 * | Indexes    | Properties  |
 * | :-----     | ----------  |
 * | _id        | UNIQUE      |
 * | user_1     | UNIQUE      |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.CalendarSetting
 * @typedef TCategoryColors
 *
 * @prop {string} schoolCalendar - 학교 캘린더 색상
 * @prop {string} personalCalendar - 개인 캘린더 색상
 * @prop {string} enrollments - 수강 수업 색상
 * @prop {string} mentorings - 담당 수업 색상
 * @prop {string} memos - 메모 색상
 */
const categoryColorsSchema = mongoose.Schema(
  {
    schoolCalendar: { type: String },
    personalCalendar: { type: String },
    enrollments: { type: String },
    mentorings: { type: String },
    memos: { type: String },
  },
  { _id: false }
);

/**
 * @memberof Models.CalendarSetting
 * @typedef TCalendarSetting
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - user._id
 * @prop {Number[]} visibleDays - 주간 뷰에 표시할 요일 (0=일요일 ~ 6=토요일)
 * @prop {string} referenceTime - 기준 시간 (HH:MM 형식, null이면 현재 시간으로 스크롤)
 * @prop {TCategoryColors} categoryColors - 기본 캘린더 카테고리별 색상 오버라이드
 */
const calendarSettingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      unique: true,
    },
    visibleDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6],
    },
    referenceTime: {
      type: String,
      default: null,
    },
    categoryColors: {
      type: categoryColorsSchema,
      default: {},
    },
  },
  { timestamps: true }
);

calendarSettingSchema.index({ user: 1 }, { unique: true });

export const CalendarSetting = (dbName) => {
  return conn[dbName].model("CalendarSetting", calendarSettingSchema);
};
