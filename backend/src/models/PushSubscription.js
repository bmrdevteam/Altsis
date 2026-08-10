/**
 * PushSubscription namespace
 * @namespace Models.PushSubscription
 * @version 1.0.0
 *
 * @description Web Push 구독 정보 (기기/브라우저별)
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const pushSubscriptionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    expirationTime: {
      type: Number,
      default: null,
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export const PushSubscription = (dbName) => {
  return conn[dbName].model("PushSubscription", pushSubscriptionSchema);
};
