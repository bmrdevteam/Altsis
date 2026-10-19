/**
 * One-time Alter confirmation. The browser sees the public card only.
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const alterConfirmationSchema = mongoose.Schema(
  {
    confirmationId: { type: String, required: true, unique: true },
    user: { type: mongoose.Types.ObjectId, required: true },
    school: { type: mongoose.Types.ObjectId },
    skillId: { type: String, default: "" },
    stage: { type: String, default: "" },
    request: { type: String, default: "" },
    fingerprint: { type: String, default: "" },
    conversationId: { type: String, default: "" },
    expiresAt: { type: Date },
    consumed: { type: Boolean, default: false },
    status: { type: String, default: "pending" },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

alterConfirmationSchema.index({ user: 1, status: 1 });

export const AlterConfirmation = (dbName) =>
  conn[dbName].model("AlterConfirmation", alterConfirmationSchema);
