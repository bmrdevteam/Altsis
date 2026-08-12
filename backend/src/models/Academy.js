/**
 * Academy namespace
 * @namespace Models.Academy
 * @version 2.0.0
 *
 * @description 아카데미; academy document는 루트 DB에 저장되며 academy 관련 도큐먼트는 아카데미 DB에 저장된다.
 * | Indexes      | Properties  |
 * | :-----       | ----------  |
 * | _id          | UNIQUE      |
 * | academyId_1  | UNIQUE      |
 */

import mongoose from "mongoose";
import { root as conn } from "../_database/mongodb/root.js";

import { validate } from "../utils/validate.js";

/**
 * @memberof Models.Academy
 * @typedef TAcademy
 *
 * @prop {string} academyId - 아카데미 ID; validate
 * @prop {string} academyName - 아카데미 이름; validate
 * @prop {string} email - validate
 * @prop {string} tel - validate
 * @prop {string} adminId - validate
 * @prop {string} adminName - validate
 * @prop {string} dbName - 아카데미 DB명; 아카데미 생성 시 자동 설정되며 API를 통해 조회할 수 없다
 * @prop {boolean} isActivated=true - 아카데미 활성화 상태; false인 경우 해당 아카데미에 로그인할 수 없다
 * @prop {boolean} chatEnabled=false - 채팅 기능 활성화 상태
 * @prop {boolean} boardEnabled=true - 보드 기능 활성화 상태
 * @prop {boolean} aiEnabled=false - AI 기능 활성화 상태
 * @prop {boolean} sitePublishEnabled=false - 공개 웹사이트 기능 허용 (owner)
 * @prop {boolean} sitePublished=false - 공개 웹사이트 외부 게시 여부 (admin)
 * @prop {string} aiApiKey - AI API 키; API를 통해 조회할 수 없다
 * @prop {string} aiProvider="gemini" - AI 제공자; openai | anthropic | gemini(테스트용)
 * @prop {Object} [aiUsageLimits] - 사용자별 AI 일일 Alt 한도 (1 Alt = 10,000 토큰)
 *
 */
const aiUsageLimitsSchema = mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    /** 1인당 일(UTC) Alt 한도. 1 Alt = 10,000 토큰 */
    dailyUserAlts: { type: Number, default: 0 },
    /** @deprecated use dailyUserAlts */
    monthlyUserTokens: { type: Number, default: 0 },
  },
  { _id: false }
);

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
    chatEnabled: { type: Boolean, default: false },
    boardEnabled: { type: Boolean, default: true },
    aiEnabled: { type: Boolean, default: false },
    sitePublishEnabled: { type: Boolean, default: false },
    sitePublished: { type: Boolean, default: false },
    aiApiKey: { type: String, select: false },
    aiProvider: {
      type: String,
      enum: ["openai", "anthropic", "gemini"],
      default: "gemini",
    },
    aiModel: { type: String, default: "gemini-3.6-flash" },
    aiUsageLimits: {
      type: aiUsageLimitsSchema,
      default: () => ({ enabled: false, dailyUserAlts: 0 }),
    },
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
