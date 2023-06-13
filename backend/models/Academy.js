/**
 * Academy namespace
 * @namespace Models.Academy
 * @version 2.0.0
 */

import mongoose from "mongoose";
import { root as conn } from "../_database/mongodb/root.js";

import { validate } from "../utils/validate.js";

/**
 * @memberof Models.Academy
 * @alias TAcademy
 * @summary 아카데미
 *
 * @prop {string} academyId - 아카데미 ID; unique; validate
 * @prop {string} academyName - 아카데미 이름; validate
 * @prop {string} email - validate
 * @prop {string} tel - validate
 * @prop {string} adminId - validate
 * @prop {string} adminName - validate
 * @prop {string} dbName - 아카데미 DB명; 아카데미 생성 시 자동 설정되며 API를 통해 조회할 수 없다
 * @prop {string} isActivated - 아카데미 활성화 상태; false인 경우 해당 아카데미에 로그인할 수 없다
 *
 * @description academy document는 루트 DB에 저장되며 academy 관련 도큐먼트는 아카데미 DB에 저장된다.
 */
const academySchema = mongoose.Schema(
  {
    academyId: {
      type: String,
      unique: true,
      validate: (val) => validate("academyId", val),
    },
    academyName: {
      type: String,
      validate: (val) => validate("academyName", val),
    },
    email: {
      type: String,
      validate: (val) => validate("email", val),
    },
    tel: {
      type: String,
      validate: (val) => validate("tel", val),
    },
    adminId: {
      type: String,
      validate: (val) => validate("userId", val),
    },
    adminName: {
      type: String,
      validate: (val) => validate("userName", val),
    },
    dbName: {
      type: String,
      select: false,
    },
    isActivated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

academySchema.pre("save", function (next) {
  var academy = this;
  if (academy.isModified("academyId")) {
    academy.dbName = academy.academyId + "-db";
  }
  next();
});

export const Academy =
  process.env.NODE_ENV?.trim() !== "test"
    ? conn?.model("Academy", academySchema)
    : {};
