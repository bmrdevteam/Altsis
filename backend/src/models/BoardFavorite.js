/**
 * BoardFavorite namespace
 * @namespace Models.BoardFavorite
 * @version 1.0.0
 *
 * @description 사용자 보드 즐겨찾기
 * | Indexes              | Properties        |
 * | :-----               | ----------        |
 * | _id                  | UNIQUE            |
 * | user_1_school_1      |                   |
 * | user_1_board_1       | UNIQUE; COMPOUND  |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.BoardFavorite
 * @typedef TBoardFavorite
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - user._id
 * @prop {ObjectId} board - board._id
 * @prop {ObjectId} school - school._id
 * @prop {number} order - 정렬 순서
 */
const boardFavoriteSchema = mongoose.Schema(
  {
    user: {
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

boardFavoriteSchema.index({ user: 1, school: 1 });
boardFavoriteSchema.index({ user: 1, board: 1 }, { unique: true });

export const BoardFavorite = (dbName) => {
  return conn[dbName].model("BoardFavorite", boardFavoriteSchema);
};
