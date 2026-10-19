/**
 * One-time confirmation cards. No domain imports.
 * A card is spent on the first proceed, apply, or cancel.
 */

import { createHash, randomBytes } from "crypto";

const STAGES = new Set(["propose", "propose_execute", "before_execute", "before_apply"]);

export const confirmationFingerprint = (skillId, request) =>
  createHash("sha256")
    .update(`${String(skillId || "")}\n${String(request || "").trim()}`)
    .digest("hex")
    .slice(0, 24);

/**
 * @param {{ skillId: string, stage: string, actorId?: string, schoolId?: string, request?: string, conversationId?: string, ttlMs?: number, now?: number }} input
 */
export const issueConfirmation = ({
  skillId,
  stage,
  actorId = "",
  schoolId = "",
  request = "",
  conversationId = "",
  ttlMs = 24 * 60 * 60 * 1000,
  now = Date.now(),
} = {}) => {
  if (!STAGES.has(stage)) throw new Error(`확인 단계가 올바르지 않습니다: ${stage}`);
  const at = Number(now) || Date.now();
  return {
    id: randomBytes(16).toString("hex"),
    skillId: String(skillId || ""),
    stage,
    actorId: String(actorId || ""),
    schoolId: String(schoolId || ""),
    request: String(request || "").slice(0, 2000),
    fingerprint: confirmationFingerprint(skillId, request),
    conversationId: conversationId ? String(conversationId) : "",
    createdAt: new Date(at).toISOString(),
    expiresAt: new Date(at + ttlMs).toISOString(),
    consumed: false,
    status: "pending",
  };
};

/**
 * @param {object|null} record
 * @param {{ actorId?: string, action?: string, now?: number }} input
 */
export const redeemConfirmation = (record, { actorId = "", action = "", now = Date.now() } = {}) => {
  if (!record) return { ok: false, code: "NOT_FOUND", message: "확인을 찾을 수 없습니다." };
  if (String(record.actorId || "") !== String(actorId || "")) {
    return { ok: false, code: "FORBIDDEN", message: "이 확인은 다른 계정의 것입니다." };
  }
  if (record.consumed || record.status === "consumed" || record.status === "cancelled") {
    return { ok: false, code: "CONSUMED", message: "이미 사용한 확인입니다. 다시 요청해 주세요." };
  }
  const expires = new Date(record.expiresAt).getTime();
  if (!expires || expires <= now) {
    return {
      ok: false,
      code: "EXPIRED",
      message: "확인 시간이 지났습니다. 다시 확인해 주세요.",
      restore: "reconfirm",
    };
  }
  if (action === "cancel") {
    return { ok: true, next: { ...record, consumed: true, status: "cancelled" } };
  }
  if (action === "apply") {
    if (record.stage !== "before_apply") {
      return { ok: false, code: "STAGE", message: "반영 전 확인이 아닙니다." };
    }
    return { ok: true, next: { ...record, consumed: true, status: "consumed" } };
  }
  if (action === "proceed") {
    if (record.stage === "before_apply") {
      return { ok: false, code: "STAGE", message: "이 확인은 반영 단계입니다." };
    }
    return { ok: true, next: { ...record, consumed: true, status: "consumed" } };
  }
  return { ok: false, code: "INVALID", message: "진행, 반영, 취소 중 하나를 선택해 주세요." };
};

/** Fields the browser may keep. The request body stays on the server. */
export const publicConfirmation = (record, { title = "", summary = "" } = {}) => {
  if (!record) return null;
  return {
    id: record.id,
    stage: record.stage,
    skillId: record.skillId,
    title: title || record.skillId,
    status: record.status,
    expiresAt: record.expiresAt,
    summary: String(summary || "").slice(0, 300),
  };
};
