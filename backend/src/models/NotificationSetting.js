/**
 * NotificationSetting namespace
 * @namespace Models.NotificationSetting
 * @version 1.0.0
 *
 * @description 알림 설정
 * | Indexes    | Properties  |
 * | :-----     | ----------  |
 * | _id        | UNIQUE      |
 * | user_1     | UNIQUE      |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.NotificationSetting
 * @typedef TNotificationSettings
 *
 * @prop {boolean} classInvitation - 수업 초대 알림
 * @prop {boolean} classCancellation - 수업 초대 취소 알림
 * @prop {boolean} classApproval - 수업 승인 알림
 * @prop {boolean} classApprovalCancel - 수업 승인 취소 알림
 * @prop {boolean} scheduleStart - 일정 시작 알림
 * @prop {boolean} newPost - 새 게시글 알림
 * @prop {boolean} chatMessage - 직접 메시지 알림
 * @prop {boolean} soundEnabled - 알림음 활성화
 * @prop {boolean} webPushEnabled - 잠금화면 Web Push (기본 OFF)
 * @prop {boolean} emailEnabled - 이메일 알림 수신 (기본 OFF)
 * @prop {boolean} altFormApprovalRequest - Alt 폼 승인·회람 알림
 * @prop {boolean} altFormApprovalResult - Alt 폼 승인 결과 알림
 */
const settingsSchema = mongoose.Schema(
  {
    classInvitation: { type: Boolean, default: true },
    classCancellation: { type: Boolean, default: true },
    classApproval: { type: Boolean, default: true },
    classApprovalCancel: { type: Boolean, default: true },
    scheduleStart: { type: Boolean, default: true },
    newPost: { type: Boolean, default: true },
    chatMessage: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    reminder: { type: Boolean, default: true },
    boardInvitation: { type: Boolean, default: true },
    altFormApprovalRequest: { type: Boolean, default: true },
    altFormApprovalResult: { type: Boolean, default: true },
    eventReminderDefault: { type: Number, default: 15 },
    webPushEnabled: { type: Boolean, default: false },
    emailEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const settingsDefault = {
  classInvitation: true,
  classCancellation: true,
  classApproval: true,
  classApprovalCancel: true,
  scheduleStart: true,
  newPost: true,
  chatMessage: true,
  soundEnabled: true,
  reminder: true,
  boardInvitation: true,
  altFormApprovalRequest: true,
  altFormApprovalResult: true,
  eventReminderDefault: 15,
  webPushEnabled: false,
  emailEnabled: false,
};

/**
 * @memberof Models.NotificationSetting
 * @typedef TNotificationSetting
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {TNotificationSettings} settings - 알림 설정
 */
const notificationSettingSchema = mongoose.Schema(
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
    settings: {
      type: settingsSchema,
      default: settingsDefault,
    },
  },
  { timestamps: true }
);

notificationSettingSchema.index({ user: 1 }, { unique: true });

export const NotificationSetting = (dbName) => {
  return conn[dbName].model("NotificationSetting", notificationSettingSchema);
};
