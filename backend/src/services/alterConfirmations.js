/**
 * Mongo port for dispatch confirmations. The skill layer calls this only
 * after boot registers it.
 */

import { AlterConfirmation } from "../models/AlterConfirmation.js";

const toRecord = (doc) => {
  if (!doc) return null;
  return {
    id: doc.confirmationId,
    skillId: doc.skillId,
    stage: doc.stage,
    actorId: String(doc.user || ""),
    schoolId: doc.school ? String(doc.school) : "",
    request: doc.request || "",
    fingerprint: doc.fingerprint || "",
    conversationId: doc.conversationId || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : "",
    consumed: doc.consumed === true,
    status: doc.status || "pending",
    payload: doc.payload || null,
  };
};

const toDoc = (record) => ({
  confirmationId: record.id,
  user: record.actorId,
  school: record.schoolId || undefined,
  skillId: record.skillId,
  stage: record.stage,
  request: record.request,
  fingerprint: record.fingerprint,
  conversationId: record.conversationId,
  expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined,
  consumed: record.consumed === true,
  status: record.status,
  payload: record.payload || null,
});

export const confirmationMongoPort = {
  async save(academyId, record) {
    await AlterConfirmation(academyId).findOneAndUpdate(
      { confirmationId: record.id },
      { $set: toDoc(record) },
      { upsert: true }
    );
    return record;
  },
  async get(academyId, id) {
    const doc = await AlterConfirmation(academyId).findOne({ confirmationId: id }).lean();
    return toRecord(doc);
  },
};
