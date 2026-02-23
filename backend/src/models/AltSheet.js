/**
 * AltSheet namespace
 * @namespace Models.AltSheet
 * @version 1.0.0
 *
 * @description Alt Board 시트 (Form과 1:1)
 * | Indexes          | Properties        |
 * | :-----           | ----------        |
 * | _id              | UNIQUE            |
 * | form_1           | UNIQUE            |
 * | board_1          |                   |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AltSheet
 * @typedef TAltSheet
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} form - AltForm._id (1:1)
 * @prop {ObjectId} board - board._id
 * @prop {ObjectId} school - school._id
 * @prop {string} name - 시트명 (= Form 제목과 동기화)
 * @prop {boolean} isActive - 활성화 상태
 */
const altSheetSchema = mongoose.Schema(
  {
    form: { type: mongoose.Types.ObjectId, required: true },
    board: { type: mongoose.Types.ObjectId, required: true },
    school: { type: mongoose.Types.ObjectId, required: true },

    name: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

altSheetSchema.index({ form: 1 }, { unique: true });
altSheetSchema.index({ board: 1 });

export const AltSheet = (dbName) => {
  return conn[dbName].model("AltSheet", altSheetSchema);
};
