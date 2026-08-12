/**
 * AltSheetOpen — 사용자별 양식 기록(시트) 마지막 열람 시각
 *
 * 목록의 unreadResponseCount = lastOpenedAt 이후 생성된 응답 행 수.
 * lastOpenedAt이 없으면 unread는 0 (기준 미설정).
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const altSheetOpenSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    form: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    board: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    lastOpenedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: false }
);

altSheetOpenSchema.index({ user: 1, form: 1 }, { unique: true });
altSheetOpenSchema.index({ user: 1, board: 1 });

export const AltSheetOpen = (dbName) => {
  return conn[dbName].model("AltSheetOpen", altSheetOpenSchema);
};
