/**
 * Dispatch channel. Executors and the confirmation store are registered
 * from the HTTP boot path so this file does not import domain services.
 */

import { issueConfirmation, publicConfirmation, redeemConfirmation } from "../core/confirmation.js";
import { planDispatch } from "../policy/dispatchPlan.js";
import { getCapability } from "./catalog.js";

const executors = new Map();
const memory = new Map();
let port = null;

const memoryKey = (academyId, id) => `${academyId || "local"}:${id}`;

export const registerDispatchExecutor = (skillId, fn) => {
  if (typeof fn === "function") executors.set(String(skillId), fn);
};

export const registerConfirmationPort = (next) => {
  port = next && typeof next.save === "function" && typeof next.get === "function" ? next : null;
};

export const resetDispatchState = () => {
  executors.clear();
  memory.clear();
  port = null;
};

const saveRecord = async (academyId, record) => {
  if (port) return port.save(academyId, record);
  memory.set(memoryKey(academyId, record.id), record);
  return record;
};

const loadRecord = async (academyId, id) => {
  if (port) return port.get(academyId, id);
  return memory.get(memoryKey(academyId, id)) || null;
};

const actorIdOf = (ctx) => String(ctx?.user?._id || ctx?.user?.id || "");
const schoolIdOf = (ctx) => String(ctx?.school?._id || ctx?.schoolId || "");

const proposalText = (capability, stage) => {
  const title = capability?.title || "초안";
  if (stage === "before_execute" || stage === "propose_execute") {
    return `${title} 작업은 실행 전에 확인이 필요합니다. 진행할까요?`;
  }
  return `${title} 스킬로 초안을 만들 수 있습니다. 진행할까요?`;
};

const issue = async ({ academyId, ctx, skillId, stage, request, summary, title, payload }) => {
  const record = issueConfirmation({
    skillId,
    stage,
    actorId: actorIdOf(ctx),
    schoolId: schoolIdOf(ctx),
    request,
    conversationId: ctx?.conversationId || "",
  });
  record.payload = payload || null;
  await saveRecord(academyId, record);
  return publicConfirmation(record, { title, summary });
};

const runExecutor = async ({ academyId, ctx, capability, request }) => {
  const exec = executors.get(capability.id);
  if (!exec) {
    return {
      text: "이 스킬 실행기가 아직 연결되지 않았습니다.",
      draft: null,
      confirmation: null,
      executed: false,
    };
  }
  const result = await exec({
    academyId,
    user: ctx?.user,
    seasonId: ctx?.seasonId || ctx?.pageContext?.seasonId,
    context: ctx?.pageContext || {},
    message: request,
  });
  const summary = result?.text || "초안을 만들었습니다. 확인 후 반영해 주세요.";
  const card = await issue({
    academyId,
    ctx,
    skillId: capability.id,
    stage: "before_apply",
    request,
    summary,
    title: capability.title,
    payload: { request },
  });
  const draft = result?.draft ? { ...result.draft, confirmationId: card.id } : null;
  return { text: summary, draft, confirmation: card, executed: true };
};

/**
 * Propose or run one dispatch skill. A proposal does not call the executor.
 */
export const dispatchTurn = async ({ skillId, request, skillGate, ctx, academyId } = {}) => {
  const id = String(skillId || "").trim();
  const capability = getCapability(id);
  const academy = academyId || ctx?.academyId;
  if (!capability || capability.channel !== "dispatch") {
    return {
      text: "요청한 기능을 찾지 못했습니다.",
      draft: null,
      confirmation: null,
      executed: false,
    };
  }
  const plan = planDispatch({
    actor: skillGate?.actor,
    flags: skillGate?.flags,
    chip: skillGate?.chip,
    capability,
  });
  if (plan.decision === "deny") {
    return {
      text: plan.userMessage,
      draft: null,
      confirmation: null,
      executed: false,
      reasonCode: plan.reasonCode,
    };
  }
  const asked = String(request || ctx?.message || "").trim();
  if (!plan.executeNow) {
    const text = proposalText(capability, plan.stage);
    const card = await issue({
      academyId: academy,
      ctx,
      skillId: id,
      stage: plan.stage,
      request: asked,
      summary: text,
      title: capability.title,
      payload: {
        request: asked,
        seasonId: ctx?.seasonId || "",
        pageContext: ctx?.pageContext || null,
      },
    });
    return { text, draft: null, confirmation: card, executed: false };
  }
  return runExecutor({ academyId: academy, ctx, capability, request: asked });
};

/**
 * Spend a card. proceed runs the executor once. apply does not write domain data.
 */
export const redeemDispatch = async ({
  academyId,
  actorId,
  user,
  confirmationId,
  action,
} = {}) => {
  const record = await loadRecord(academyId, confirmationId);
  const redeemed = redeemConfirmation(record, { actorId, action });
  if (!redeemed.ok) return redeemed;
  await saveRecord(academyId, redeemed.next);
  if (action === "cancel") return { ok: true, cancelled: true, skillId: record.skillId };
  if (action === "apply") return { ok: true, applied: true, skillId: record.skillId };
  const capability = getCapability(record.skillId);
  if (!capability) return { ok: false, code: "NOT_FOUND", message: "스킬을 찾을 수 없습니다." };
  const ctx = {
    academyId,
    user,
    seasonId: record.payload?.seasonId || "",
    pageContext: record.payload?.pageContext || {},
    school: record.schoolId ? { _id: record.schoolId } : undefined,
  };
  const ran = await runExecutor({
    academyId,
    ctx,
    capability,
    request: record.request,
  });
  if (!ran.executed) {
    return { ok: false, code: "NO_EXECUTOR", message: ran.text };
  }
  return {
    ok: true,
    text: ran.text,
    draft: ran.draft,
    confirmation: ran.confirmation,
    skillId: record.skillId,
  };
};

/** Chip path already ran the executor. Attach the apply card only. */
export const attachApplyConfirmation = async ({
  academyId,
  actorId,
  schoolId,
  skillId,
  request,
  draft,
  summary,
} = {}) => {
  const card = await issue({
    academyId,
    ctx: { user: { _id: actorId }, school: schoolId ? { _id: schoolId } : undefined },
    skillId,
    stage: "before_apply",
    request,
    summary: summary || "초안을 확인한 뒤 반영해 주세요.",
    title: getCapability(skillId)?.title || skillId,
    payload: { request },
  });
  return {
    confirmation: card,
    draft: draft ? { ...draft, confirmationId: card.id } : draft,
  };
};
