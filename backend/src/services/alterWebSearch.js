/**
 * Live web search quota and usage log. The provider call stays in alter/providers.
 * Scripted results are not logged, so a demo key does not spend the daily limit.
 */

import { WEB_SEARCH_DAILY_LIMIT } from "../alter/core/limits.js";
import { runProviderWebSearch } from "../alter/providers/webSearch.js";
import { getDayWindowUTC } from "./aiUsageQuota.js";
import { logAIUsage } from "./aiUsage.js";

export const WEB_SEARCH_FEATURE = "alter-web-search";

export const countWebSearchesToday = async (academyId, userId, now = new Date()) => {
  if (!academyId || !userId) return 0;
  const { AIUsageLog } = await import("../models/index.js");
  const { from, to } = getDayWindowUTC(now);
  return AIUsageLog(academyId).countDocuments({
    user: userId,
    feature: WEB_SEARCH_FEATURE,
    success: true,
    createdAt: { $gte: from, $lt: to },
  });
};

export const runAlterWebSearch = async ({ ctx = {}, query, limit, countToday } = {}) => {
  const user = ctx.user || {};
  const academyId = ctx.academyId;
  const count =
    typeof countToday === "function"
      ? countToday
      : () => countWebSearchesToday(academyId, user._id);
  if (academyId && user._id) {
    const used = Number(await count()) || 0;
    if (used >= WEB_SEARCH_DAILY_LIMIT) {
      return { ok: false, error: "LIMIT_REACHED", results: [] };
    }
  }
  const result = await runProviderWebSearch({
    provider: ctx.academy?.aiProvider,
    apiKey: ctx.academy?.aiApiKey,
    model: ctx.academy?.aiModel,
    query,
    limit,
    fetchImpl: ctx.fetchWeb,
  });
  if (result?.ok && !result.scripted && academyId && user._id && user.userId && user.userName) {
    await logAIUsage(academyId, {
      user,
      provider: ctx.academy?.aiProvider || "unknown",
      model: ctx.academy?.aiModel || "unknown",
      feature: WEB_SEARCH_FEATURE,
      success: true,
      tokenUsage: result.usage,
    });
  }
  return result;
};
