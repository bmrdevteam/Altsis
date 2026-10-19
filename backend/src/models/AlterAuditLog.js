/**
 * Per-academy Alter audit log. expiresAt is the school-year retention date.
 * Mongo deletes the document when that date is reached.
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const alterAuditLogSchema = mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    academyId: { type: String, default: "" },
    userId: { type: String, default: "" },
    role: { type: String, default: "" },
    skillId: { type: String, default: "" },
    kind: { type: String, default: "" },
    decision: { type: String, default: "" },
    reasonCode: { type: String, default: "" },
    conversationId: { type: String, default: "" },
    confirmationId: { type: String, default: "" },
    costEstimate: { type: Number },
    maskedQuery: { type: String, default: "" },
    viewAcademyId: { type: String, default: "" },
    viewFrom: { type: String, default: "" },
    viewTo: { type: String, default: "" },
  },
  { timestamps: false }
);

alterAuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
alterAuditLogSchema.index({ createdAt: -1 });

export const AlterAuditLog = (dbName) => conn[dbName].model("AlterAuditLog", alterAuditLogSchema);
