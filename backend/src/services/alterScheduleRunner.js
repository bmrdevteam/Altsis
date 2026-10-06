/**
 * Wires due Alter routines to Redis, the read-only agent, and notifications.
 */

import { Academy, AlterSchedule, User } from "../models/index.js";
import { client } from "../_database/redis/index.js";
import { logger } from "../log/logger.js";
import { assertSeasonAiAccess } from "./aiSkills.js";
import { executeAgentSkill } from "./alterAgent.js";
import { appendAlterTurn } from "./alterConversations.js";
import { sendAutoNotification } from "./notifications.js";
import {
  claimDueDocument,
  releaseClaimToken,
} from "./alterScheduleService.js";
import {
  executeClaimedSchedule as runClaimed,
  processDueAlterSchedules as runDue,
  runClaimedSlot,
} from "./alterScheduleRun.js";

const DEDUP_TTL = 24 * 60 * 60;

export const tryClaimSlot = async (key) => {
  try {
    const result = await client.v4.set(key, "1", { NX: true, EX: DEDUP_TTL });
    return result === "OK";
  } catch (err) {
    logger.error(`Redis alter schedule claim failed: ${err.message}`);
    return null;
  }
};

export const releaseSlot = async (key) => {
  try {
    await client.v4.del(key);
  } catch (err) {
    logger.error(`Redis alter schedule release failed: ${err.message}`);
  }
};

export const loadScheduleRunContext = async (academyId, doc) => {
  const user = await User(academyId).findById(doc.user);
  if (!user) {
    const err = new Error("사용자를 찾을 수 없어 건너뛰었습니다.");
    err.code = "SCHEDULE_USER_MISSING";
    err.skip = true;
    throw err;
  }
  try {
    const access = await assertSeasonAiAccess(
      academyId,
      user,
      String(doc.season)
    );
    return { ...access, user };
  } catch (err) {
    err.skip = true;
    throw err;
  }
};

const saveClaimed = (academyId, doc) => async (id, patch) => {
  await AlterSchedule(academyId).updateOne(
    { _id: id, claimToken: doc.claimToken },
    { $set: patch }
  );
};

export const executeClaimedSchedule = (args) =>
  runClaimed({
    ...args,
    deps: {
      loadContext: loadScheduleRunContext,
      executeAgent: executeAgentSkill,
      persistTurn: appendAlterTurn,
      notify: sendAutoNotification,
      save: saveClaimed(args.academyId, args.doc),
      ...(args.deps || {}),
    },
  });

const claimInAcademy = (academyId, now) =>
  claimDueDocument(AlterSchedule(academyId), now);

const releaseInAcademy = (academyId, doc) =>
  releaseClaimToken(AlterSchedule(academyId), doc);

export const processDueAlterSchedules = (deps = {}) => {
  const claim = deps.claim || claimInAcademy;
  const releaseMongo = deps.releaseMongo || releaseInAcademy;
  const runSlot =
    deps.runSlot ||
    ((slot) =>
      runClaimedSlot({
        ...slot,
        tryClaim: tryClaimSlot,
        release: releaseSlot,
        execute: executeClaimedSchedule,
      }));
  const academiesPromise = deps.academies
    ? Promise.resolve(deps.academies)
    : Academy.find({ isActivated: true }).select("academyId").lean();
  return academiesPromise.then((academies) =>
    runDue({
      ...deps,
      academies,
      claim,
      runSlot,
      releaseMongo,
    })
  );
};
