/**
 * Reservation namespace
 * @namespace Models.Reservation
 * @version 1.0.0
 *
 * @description 예약 신청
 * | Indexes                              | Properties        |
 * | :-----                               | ----------        |
 * | _id                                  | UNIQUE            |
 * | slot_1_user_1                        | UNIQUE; COMPOUND  |
 * | post_1_user_1                        | COMPOUND          |
 * | post_1_status_1                      | COMPOUND          |
 * | user_1_school_1_status_1             | COMPOUND          |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Reservation
 * @typedef TReservation
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} slot - reservationSlot._id
 * @prop {ObjectId} post - post._id
 * @prop {ObjectId} board - board._id
 * @prop {ObjectId} school - school._id
 * @prop {ObjectId} user - 신청자._id
 * @prop {string} userId - 신청자.userId
 * @prop {string} userName - 신청자.userName
 * @prop {string} date - 슬롯 날짜 스냅샷
 * @prop {string?} startTime - 슬롯 시작 시간 스냅샷 (시간 모드)
 * @prop {string?} endTime - 슬롯 종료 시간 스냅샷 (시간 모드)
 * @prop {string?} label - 슬롯 라벨 스냅샷 (라벨 모드)
 * @prop {string} status - 상태 (pending/approved/rejected/cancelled)
 * @prop {ObjectId?} processedBy - 처리자._id
 * @prop {string?} processedByName - 처리자.userName
 * @prop {Date?} processedAt - 처리 시각
 * @prop {string?} rejectReason - 거절 사유
 * @prop {string} memo - 신청 메모
 * @prop {boolean} isActive - 활성화 상태
 */
const reservationSchema = mongoose.Schema(
  {
    // 참조
    slot: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
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

    // 신청자 정보 (비정규화)
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },

    // 슬롯 정보 스냅샷 (비정규화 - 조회 편의)
    date: String,
    startTime: String,
    endTime: String,
    label: String,
    item: String,

    // 상태
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    // 지정 승인자 (신청자가 지정)
    approver: mongoose.Types.ObjectId,
    approverId: String,
    approverName: String,

    // 승인/거절 정보
    processedBy: mongoose.Types.ObjectId,
    processedByName: String,
    processedAt: Date,
    rejectReason: String,

    // 신청 메모
    memo: {
      type: String,
      default: "",
    },

    // 신청 양식 응답
    applicationResponses: {
      type: [
        {
          label: String,
          value: String,
        },
      ],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reservationSchema.index({ slot: 1, user: 1 }, { unique: true });
reservationSchema.index({ post: 1, user: 1 });
reservationSchema.index({ post: 1, status: 1 });
reservationSchema.index({ user: 1, school: 1, status: 1 });

export const Reservation = (dbName) => {
  return conn[dbName].model("Reservation", reservationSchema);
};
