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
 * @prop {"undefined"|"view"|"viewAndEdit"} authStudent="undefined"
 * @prop {"undefined"|"viewAndEdit"} authManager="undefined"
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
      enum: ["undefined", "view", "viewAndEdit"],
      default: "undefined",
    },
    authManager: {
      type: String,
      enum: ["undefined", "viewAndEdit"],
      default: "undefined",
    },
  },
  { _id: false }
);

/**
 * @memberof Models.School
 * @typedef TDeletedFormArchiveItem
 *
 * @prop {string} label
 * @prop {"array"|"object"} dataType="array"
 * @prop {TFormArchiveField[]} fields
 * @prop {"undefined"|"viewAndEditStudents"|"viewAndEditMyStudents"} authTeacher="undefined"
 * @prop {"undefined"|"view"|"viewAndEdit"} authStudent="undefined"
 * @prop {"undefined"|"viewAndEdit"} authManager="undefined"
 * @prop {Date} deletedAt - 삭제된 시점
 *
 */
const deletedFormArchiveItemSchema = mongoose.Schema(
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
      enum: ["undefined", "view", "viewAndEdit"],
      default: "undefined",
    },
    authManager: {
      type: String,
      enum: ["undefined", "viewAndEdit"],
      default: "undefined",
    },
    deletedAt: { type: Date, default: Date.now },
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
 * @prop {TDeletedFormArchiveItem[]} deletedFormArchive - 삭제된 기록 양식 (휴지통)
 * @prop {TLink[]} links - 링크 목록
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
    deletedFormArchive: { type: [deletedFormArchiveItemSchema], default: [] },
    links: { type: [LinkSchema] },
    boardNotificationEvents: {
      type: {
        newPost: { type: Boolean, default: false },
        boardInvitation: { type: Boolean, default: false },
        altFormApprovalRequest: { type: Boolean, default: false },
        altFormApprovalResult: { type: Boolean, default: false },
      },
      default: {
        newPost: false,
        boardInvitation: false,
        altFormApprovalRequest: false,
        altFormApprovalResult: false,
      },
    },
  },
  { timestamps: true }
);

export const School = (dbName) => {
  return conn[dbName].model("School", schoolSchema);
};
