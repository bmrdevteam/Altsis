/**
 * Schedule execution without Redis, notifications, or the agent module.
 * Callers pass those in so tests stay free of their import graph.
 */

import { logger } from "../log/logger.js";
import {
  NOTIFY_MAX,
  nextStateAfterRun,
  skipReasonForCode,
  slotKey,
  truncateSummary,
} from "./alterScheduleTime.js";

const skipError = (err) => {
  const code = err?.code || "";
  const skipCodes = new Set([
    "AI_NOT_ENABLED",
    "AI_NOT_ENABLED_FOR_SEASON",
    "AI_USAGE_LIMIT_EXCEEDED",
    "PERMISSION_DENIED",
    "SCHEDULE_USER_MISSING",
    "REGISTRATION_NOT_FOUND",
    "SEASON_NOT_FOUND",
    "ACADEMY_NOT_FOUND",
    "AI_API_KEY_NOT_SET",
  ]);
  return err?.skip === true || skipCodes.has(code);
};

export const executeClaimedSchedule = async ({
  academyId,
  doc,
  preserveFutureSlot = false,
  deps = {},
}) => {
  const loadContext = deps.loadContext;
  const runAgent = deps.executeAgent;
  const persistTurn = deps.persistTurn;
  const notify = deps.notify;
  const save = deps.save;
  if (!loadContext || !runAgent || !persistTurn || !notify || !save) {
    throw new Error("schedule run deps are required");
  }

  const finish = async (status, summary, extra = {}) => {
    const patch = nextStateAfterRun(
      doc,
      {
        status,
        summary,
        conversationId: extra.conversationId,
        at: extra.at || new Date(),
      },
      { preserveFutureSlot }
    );
    await save(doc._id, patch);
    return patch;
  };

  try {
    const ctx = await loadContext(academyId, doc);
    const result = await runAgent({
      academyId,
      user: ctx.user,
      academy: ctx.academy,
      season: ctx.season,
      school: ctx.school,
      registration: ctx.registration,
      message: doc.prompt,
      history: [],
      allowScheduleTool: false,
    });
    const saved = await persistTurn({
      academyId,
      userId: ctx.user._id,
      seasonId: String(doc.season),
      userMessage: doc.prompt,
      assistantMessage: result.text || "",
      skill: "agent",
      tokenUsage: result.tokenUsage,
      links: result.links || [],
    });
    const conversationId = saved?.conversation?._id;
    const summary = truncateSummary(result.text || "");
    if (conversationId) {
      try {
        await notify({
          academyId,
          toUserList: [
            {
              user: ctx.user._id,
              userId: ctx.user.userId,
              userName: ctx.user.userName,
            },
          ],
          notificationType: "alterSchedule",
          category: "Alter",
          title: doc.title || "예약 실행",
          description: truncateSummary(summary, NOTIFY_MAX),
          relatedEntity: { type: "alterConversation", id: conversationId },
        });
      } catch (err) {
        logger.error(`alter schedule notify failed ${doc._id}: ${err.message}`);
      }
    }
    return finish("ok", summary, { conversationId });
  } catch (err) {
    if (skipError(err)) {
      const reason = skipReasonForCode(err.code, err.message);
      logger.info(`alter schedule skipped ${doc._id}: ${reason}`);
      return finish("skipped", reason);
    }
    logger.error(`alter schedule run failed ${doc._id}: ${err.message}`);
    return finish("error", err.message || "실행하지 못했습니다.");
  }
};

export const runClaimedSlot = async ({
  academyId,
  doc,
  tryClaim,
  release,
  execute,
  releaseMongo = null,
}) => {
  const key = slotKey(academyId, doc);
  const claimed = await tryClaim(key);
  if (claimed === false) {
    if (releaseMongo) await releaseMongo(doc);
    return { ran: false, reason: "duplicate" };
  }
  try {
    const patch = await execute({ academyId, doc });
    return { ran: true, patch };
  } catch (err) {
    if (claimed === true && release) await release(key);
    throw err;
  }
};

export const processDueAlterSchedules = async (deps = {}) => {
  const now = deps.now || new Date();
  const academies = deps.academies || [];
  const claim = deps.claim;
  const runSlot = deps.runSlot;
  const releaseMongo = deps.releaseMongo;
  if (!claim || !runSlot) throw new Error("schedule tick deps are required");

  for (const academy of academies) {
    const academyId = academy.academyId || academy;
    if (!academyId) continue;
    for (let n = 0; n < 20; n += 1) {
      let doc = null;
      try {
        doc = await claim(academyId, now);
        if (!doc) break;
        await runSlot({
          academyId,
          doc,
          releaseMongo: releaseMongo
            ? (row) => releaseMongo(academyId, row)
            : null,
        });
      } catch (err) {
        logger.error(`processDueAlterSchedules ${academyId}: ${err.message}`);
        if (doc && releaseMongo) {
          try {
            await releaseMongo(academyId, doc);
          } catch (_) {
            // leave the lease to expire
          }
        }
      }
    }
  }
};
