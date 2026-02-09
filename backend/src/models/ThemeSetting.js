/**
 * ThemeSetting namespace
 * @namespace Models.ThemeSetting
 * @version 1.0.0
 *
 * @description 사용자 테마 설정
 * | Indexes    | Properties  |
 * | :-----     | ----------  |
 * | _id        | UNIQUE      |
 * | user_1     | UNIQUE      |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.ThemeSetting
 * @typedef TThemeColors
 *
 * @prop {string} primaryColor - 주 브랜드 색상
 * @prop {string} backgroundColor - 페이지 배경색
 * @prop {string} componentColor - 컴포넌트 배경색
 * @prop {string} textColor - 기본 텍스트 색상
 * @prop {string} accentColor - 강조/하이라이트 색상
 * @prop {string} successColor - 성공 상태 색상
 * @prop {string} errorColor - 오류 상태 색상
 */
const colorsSchema = mongoose.Schema(
  {
    primaryColor: { type: String, default: "#313775" },
    backgroundColor: { type: String, default: "#ffffff" },
    componentColor: { type: String, default: "#f5f5f5" },
    textColor: { type: String, default: "#000000" },
    accentColor: { type: String, default: "#007aff" },
    successColor: { type: String, default: "#52c41a" },
    errorColor: { type: String, default: "#ff4d4f" },
  },
  { _id: false }
);

const colorsDefault = {
  primaryColor: "#313775",
  backgroundColor: "#ffffff",
  componentColor: "#f5f5f5",
  textColor: "#000000",
  accentColor: "#007aff",
  successColor: "#52c41a",
  errorColor: "#ff4d4f",
};

/**
 * @memberof Models.ThemeSetting
 * @typedef TThemeSetting
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {string} selectedTheme - 선택된 테마 ("light" | "dark" | "high-contrast" | "sepia" | "system" | "custom")
 * @prop {TThemeColors} colors - 사용자 정의 색상
 */
const themeSettingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    selectedTheme: {
      type: String,
      default: "light",
    },
    colors: {
      type: colorsSchema,
      default: colorsDefault,
    },
  },
  { timestamps: true }
);

themeSettingSchema.index({ user: 1 }, { unique: true });

export const ThemeSetting = (dbName) => {
  return conn[dbName].model("ThemeSetting", themeSettingSchema);
};
