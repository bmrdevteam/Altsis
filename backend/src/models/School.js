/**
 * School namespace
 * @namespace Models.School
 * @version 2.0.0
 *
 * @description 학교
 * | Indexes     | Properties  |
 * | :-----      | ----------  |
 * | _id         | UNIQUE      |
 * | schoolId_1  | UNIQUE      |
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import _ from "lodash";
import { validate } from "../utils/validate.js";

/**
 * @memberof Models.School
 * @typedef TLink
 *
 * @prop {string} url - ex) https://www.naver.com
 * @prop {string} title - ex) 네이버
 */
const LinkSchema = mongoose.Schema(
  {
    url: String,
    title: String,
  },
  { _id: false }
);

/**
 * @memberof Models.School
 * @typedef TFormArchiveField
 *
 * @prop {string} label
 * @prop {"select"|"input"|"input-number"|"file"|"file-image"} type="input"
 * @prop {string[]} options - ex) ["1학년","2학년"]
 * @prop {boolean} runningTotal=false
 * @prop {boolean} total=false
 */
const formArchiveFieldSchema = mongoose.Schema(
  {
    label: String,
    type: {
      type: String,
      enum: ["select", "input", "input-number", "file", "file-image"],
      default: "input",
    },
    options: [String],
    runningTotal: {
      type: Boolean,
      default: false,
    },
    total: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/**
 * @memberof Models.School
 * @typedef TFormArchiveItem
 *
 * @prop {string} label
 * @prop {"array"|"object"} type="array"
 * @prop {TFormArchiveField[]} fields
 * @prop {"undefined"|"viewAndEditStudents"|"viewAndEditMyStudents"} authTeacher="undefined"
 * @prop {"undefined"|"view"} authStudent="undefined"
 *
 */
const formArchiveItemSchema = mongoose.Schema(
  {
    label: String,
    dataType: { type: String, enum: ["array", "object"], default: "array" },
    fields: [formArchiveFieldSchema],
    authTeacher: {
      type: String,
      enum: ["undefined", "viewAndEditStudents", "viewAndEditMyStudents"],
      default: "undefined",
    },
    authStudent: {
      type: String,
      eunum: ["undefined", "view"],
      default: "undefined",
    },
  },
  { _id: false }
);

/**
 * @memberof Models.School
 * @typedef TSchool
 *
 * @prop {ObjectId} _id
 * @prop {string} schoolId - 학교 ID; unique; validate
 * @prop {string} schoolName - 학교 이름; validate
 * @prop {TFormArchiveItem[]} formArchive - 기록 양식
 * @prop {TLink[]} links - 링크 목록
 * @prop {string?} calendar - 학사 일정 캘린더 ID
 * @prop {string?} calendarTimetable - 시간표 캘린더 ID
 *
 */
const schoolSchema = mongoose.Schema(
  {
    schoolId: {
      type: String,
      unique: true,
      validate: (val) => validate("schoolId", val),
    },
    schoolName: {
      type: String,
      validate: (val) => validate("schoolName", val),
    },
    formArchive: { type: [formArchiveItemSchema] },
    links: { type: [LinkSchema] },
    calendar: String,
    calendarTimetable: String,
  },
  { timestamps: true }
);

export const School = (dbName) => {
  return conn[dbName].model("School", schoolSchema);
};
