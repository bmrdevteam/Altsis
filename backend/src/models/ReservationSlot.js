/**
 * ReservationSlot namespace
 * @namespace Models.ReservationSlot
 * @version 1.0.0
 *
 * @description 예약 슬롯
 * | Indexes                              | Properties        |
 * | :-----                               | ----------        |
 * | _id                                  | UNIQUE            |
 * | post_1_date_1_startTime_1            | COMPOUND          |
 * | post_1_date_1_label_1                | COMPOUND          |
 * | post_1_status_1                      | COMPOUND          |
 * | post_1_dayOfWeek_1                   | COMPOUND          |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.ReservationSlot
 * @typedef TReservationSlot
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} post - post._id
 * @prop {ObjectId} board - board._id
 * @prop {ObjectId} school - school._id
 * @prop {string} date - 날짜 (YYYY-MM-DD)
 * @prop {string?} startTime - 시작 시간 (HH:mm) - 시간 모드
 * @prop {string?} endTime - 종료 시간 (HH:mm) - 시간 모드
 * @prop {string?} label - 슬롯 라벨 (예: "1교시") - 라벨 모드
 * @prop {number} dayOfWeek - 요일 (0=일 ~ 6=토)
 * @prop {number} capacity - 정원
 * @prop {number} currentCount - 현재 예약 수 (승인된 건)
 * @prop {string} status - 상태 (open/closed/full)
 * @prop {string} memo - 슬롯 메모
 * @prop {boolean} isActive - 활성화 상태
 */
const reservationSlotSchema = mongoose.Schema(
  {
    post: {
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

    // 날짜 (공통)
    date: {
      type: String,
      required: true,
    },

    // 시간 모드 (slotMode === "time")
    startTime: String,
    endTime: String,

    // 라벨 모드 (slotMode === "label") - 임의 텍스트 (예: "1교시", "오전 A")
    label: String,

    // 요일 (date에서 파생, 일괄 조회/필터용)
    dayOfWeek: {
      type: Number,
      required: true,
    },

    // 정원 관리
    capacity: {
      type: Number,
      default: 1,
    },
    currentCount: {
      type: Number,
      default: 0,
    },

    // 상태
    status: {
      type: String,
      enum: ["open", "closed", "full"],
      default: "open",
    },

    // 슬롯별 메모
    memo: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reservationSlotSchema.index({ post: 1, date: 1, startTime: 1 });
reservationSlotSchema.index({ post: 1, date: 1, label: 1 });
reservationSlotSchema.index({ post: 1, status: 1 });
reservationSlotSchema.index({ post: 1, dayOfWeek: 1 });

export const ReservationSlot = (dbName) => {
  return conn[dbName].model("ReservationSlot", reservationSlotSchema);
};
