/**
 * AltSheetRow namespace
 * @namespace Models.AltSheetRow
 * @version 1.0.0
 *
 * @description Alt Board 시트 행 (Form 응답 = Sheet 행)
 * | Indexes                        | Properties        |
 * | :-----                         | ----------        |
 * | _id                            | UNIQUE            |
 * | sheet_1__respondent_1          | COMPOUND          |
 * | sheet_1_createdAt_-1           | COMPOUND          |
 * | form_1                         |                   |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AltSheetRow
 * @typedef TAltSheetRow
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} sheet - AltSheet._id
 * @prop {ObjectId} form - AltForm._id
 * @prop {ObjectId} board - Board._id
 * @prop {ObjectId} _respondent - 응답자 user._id (직접 입력 모드에서는 수동 지정)
 * @prop {string} _respondentId - 응답자 userId
 * @prop {string} _respondentName - 응답자 userName
 * @prop {Map<string, Mixed>} data - 필드별 데이터 (필드 _id → 값)
 * @prop {Date} _submittedAt - 최초 제출 시각
 * @prop {Date} _updatedAt - 마지막 수정 시각
 * @prop {boolean} isActive - 활성화 상태
 */
const altSheetRowSchema = mongoose.Schema(
  {
    sheet: { type: mongoose.Types.ObjectId, required: true },
    form: { type: mongoose.Types.ObjectId, required: true },
    board: { type: mongoose.Types.ObjectId, required: true },

    _respondent: mongoose.Types.ObjectId,
    _respondentId: String,
    _respondentName: String,

    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },

    _submittedAt: Date,
    _updatedAt: Date,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

altSheetRowSchema.index({ sheet: 1, _respondent: 1 });
altSheetRowSchema.index({ sheet: 1, createdAt: -1 });
altSheetRowSchema.index({ form: 1 });
altSheetRowSchema.index({ form: 1, createdAt: 1 });

export const AltSheetRow = (dbName) => {
  return conn[dbName].model("AltSheetRow", altSheetRowSchema);
};
