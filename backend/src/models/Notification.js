/**
 * Notification namespace
 * @namespace Models.Notification
 * @version 2.0.0
 *
 * @description 알림
 * | Indexes            | Properties  |
 * | :-----             | ----------  |
 * | _id                | UNIQUE      |
 * | user_1_created_-1  | COMPOUND   |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import { UTC } from "../utils/date.js";

const userSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

/**
 * @memberof Models.Notification
 * @typedef TNotification
 *
 * @prop {ObjectId} _id
 * @prop {"sent"|"received"} type
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 *
 * @prop {Object[]} toUserList - type이 sent인 경우; 수신자 목록을 나타냄
 * @prop {ObjectId} fromUser - type이 received인 경우; 발신자._id
 * @prop {string} fromUserId - type이 received인 경우; 발신자.userId
 * @prop {string} fromUserName - type이 received인 경우; 발신자.userName
 * @prop {boolean} checked=false - type이 received인 경우; 확인 여부
 * @prop {string?} category
 * @prop {string} title
 * @prop {string} description
 * @prop {Date} date
 *
 */
const notificationSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["sent", "received"],
      required: true,
    },
    user: { type: mongoose.Types.ObjectId, required: true },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },

    // when type is 'sent'
    toUserList: [userSchema],
    // when type is 'received'
    fromUser: mongoose.Types.ObjectId,
    fromUserId: String,
    fromUserName: String,
    checked: Boolean,

    category: String,
    title: {
      type: String,
      required: true,
    },
    description: String,
    date: Date,
  },
  { timestamps: true }
);

notificationSchema.index({
  user: 1,
  createdAt: -1,
});

notificationSchema.pre("insertMany", function (next, docs) {
  const date = UTC();
  for (let doc of docs) {
    doc.date = date;
  }
  next();
});

export const Notification = (dbName) => {
  return conn[dbName].model("Notification", notificationSchema);
};
