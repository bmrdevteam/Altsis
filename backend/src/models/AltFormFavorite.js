/**
 * AltFormFavorite namespace
 * @namespace Models.AltFormFavorite
 * @version 1.0.0
 *
 * @description 사용자 활동(양식) 즐겨찾기
 * | Indexes              | Properties        |
 * | :-----               | ----------        |
 * | _id                  | UNIQUE            |
 * | user_1_board_1       |                   |
 * | user_1_form_1        | UNIQUE; COMPOUND  |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AltFormFavorite
 * @typedef TAltFormFavorite
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - user._id
 * @prop {ObjectId} form - altForm._id
 * @prop {ObjectId} board - board._id
 * @prop {ObjectId} school - school._id
 * @prop {number} order - 정렬 순서
 */
const altFormFavoriteSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    form: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    board: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    school: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

altFormFavoriteSchema.index({ user: 1, board: 1 });
altFormFavoriteSchema.index({ user: 1, form: 1 }, { unique: true });

export const AltFormFavorite = (dbName) => {
  return conn[dbName].model("AltFormFavorite", altFormFavoriteSchema);
};
