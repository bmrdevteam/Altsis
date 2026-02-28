/**
 * AltFormDupCounter namespace
 * @namespace Models.AltFormDupCounter
 * @version 1.0.0
 *
 * @description 양식 자유 모드 중복 검사 카운터 (atomic increment/decrement)
 * | Indexes              | Properties        |
 * | :-----               | ----------        |
 * | _id                  | UNIQUE            |
 * | form_1_key_1         | UNIQUE; COMPOUND  |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AltFormDupCounter
 * @typedef TAltFormDupCounter
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} form - AltForm._id
 * @prop {string} key - 필드값 조합의 직렬화된 키
 * @prop {number} count - 현재 사용 수
 */
const altFormDupCounterSchema = mongoose.Schema(
  {
    form: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

altFormDupCounterSchema.index({ form: 1, key: 1 }, { unique: true });

export const AltFormDupCounter = (dbName) => {
  return conn[dbName].model("AltFormDupCounter", altFormDupCounterSchema);
};
