/**
 * PostRead — 사용자별 게시글 읽음 기록
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const postReadSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    board: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

postReadSchema.index({ user: 1, post: 1 }, { unique: true });
postReadSchema.index({ user: 1, board: 1 });

export const PostRead = (dbName) => {
  return conn[dbName].model("PostRead", postReadSchema);
};
