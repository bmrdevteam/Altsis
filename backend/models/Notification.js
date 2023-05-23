import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

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
  },
  { timestamps: true }
);

notificationSchema.index({
  user: 1,
  createdAt: -1,
});

export const Notification = (dbName) => {
  return conn[dbName].model("Notification", notificationSchema);
};
