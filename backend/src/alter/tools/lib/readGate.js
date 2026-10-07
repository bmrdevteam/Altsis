/**
 * Teacher read gate for tools that schedule and event may also call.
 * Students stop here. The registry still masks and caps the payload.
 */

import { logger } from "../../../log/logger.js";
import { isSchoolManager } from "../../../utils/schoolManager.js";
import { resolveAlterContext } from "../../policy/access.js";

export const denyRead = (summary = "권한이 없습니다.") => ({
  summary,
  error: summary,
});

/** @returns {Promise<{ ok: true } | { ok: false, error: { summary: string, error: string } }>} */
export const gateTeacher = async (ctx) => {
  try {
    const resolved = await resolveAlterContext(ctx?.academyId, ctx?.user, ctx?.seasonId, {
      runner: "event",
      loaded: ctx || {},
    });
    const teacher = resolved?.role === "teacher" || ctx?.user?.auth === "owner";
    const manager = isSchoolManager(ctx?.user, ctx?.school?._id || ctx?.school);
    if (!teacher && !manager) return { ok: false, error: denyRead() };
    return { ok: true };
  } catch (err) {
    logger.error(`alter read tool denied: ${err.code || err.message}`);
    return { ok: false, error: denyRead() };
  }
};
