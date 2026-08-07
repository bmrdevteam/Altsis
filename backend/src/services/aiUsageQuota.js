/**
 * AI 사용자별 일일 Alt 한도
 * 1 Alt = 10,000 토큰
 */
import mongoose from "mongoose";
import { AI_ERRORS } from "./aiPromptPolicy.js";

/** 1 Alt = 10,000 tokens */
export const TOKENS_PER_ALT = 10_000;

/**
 * @param {number} tokens
 * @returns {number}
 */
export const tokensToAlts = (tokens) => {
  const n = Math.max(0, Number(tokens) || 0);
  return Math.round((n / TOKENS_PER_ALT) * 1e6) / 1e6;
};

/**
 * @param {number} alts
 * @returns {number}
 */
export const altsToTokens = (alts) => {
  const n = Math.max(0, Number(alts) || 0);
  return Math.floor(n * TOKENS_PER_ALT);
};

/**
 * @param {Date} [now]
 * @returns {{ from: Date, to: Date }}
 */
export const getDayWindowUTC = (now = new Date()) => {
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from, to };
};

const toObjectId = (id) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(String(id));
  }
  return id;
};

/**
 * @param {string} academyId
 * @param {import("mongoose").Types.ObjectId|string} userObjectId
 * @param {Date} from
 * @param {Date} to
 * @returns {Promise<{ usedTokens: number, requests: number }>}
 */
export const sumUserTokens = async (academyId, userObjectId, from, to) => {
  const { AIUsageLog } = await import("../models/index.js");
  const rows = await AIUsageLog(academyId).aggregate([
    {
      $match: {
        user: toObjectId(userObjectId),
        createdAt: { $gte: from, $lt: to },
      },
    },
    {
      $group: {
        _id: null,
        usedTokens: { $sum: "$totalTokens" },
        requests: { $sum: 1 },
      },
    },
  ]);
  return {
    usedTokens: rows[0]?.usedTokens || 0,
    requests: rows[0]?.requests || 0,
  };
};

/**
 * @param {Object} [limits]
 * @returns {{ enabled: boolean, dailyUserAlts: number }}
 */
export const normalizeAiUsageLimits = (limits) => {
  const enabled = !!limits?.enabled;
  let dailyUserAlts = Number(limits?.dailyUserAlts);
  if (!Number.isFinite(dailyUserAlts) || dailyUserAlts < 0) {
    // 레거시 monthlyUserTokens → Alt 환산
    const legacyTokens = Number(limits?.monthlyUserTokens);
    dailyUserAlts =
      Number.isFinite(legacyTokens) && legacyTokens > 0
        ? legacyTokens / TOKENS_PER_ALT
        : 0;
  }
  dailyUserAlts = Math.round(Math.max(0, dailyUserAlts) * 10000) / 10000;
  return { enabled, dailyUserAlts };
};

/**
 * @param {string} academyId
 * @param {Object} user - req.user (_id, userId, userName)
 * @param {Object} academy - academy doc with aiUsageLimits
 */
export const assertAiUserQuota = async (academyId, user, academy) => {
  const limits = normalizeAiUsageLimits(academy?.aiUsageLimits);
  if (!limits.enabled || limits.dailyUserAlts <= 0) return;

  const limitTokens = altsToTokens(limits.dailyUserAlts);
  if (limitTokens <= 0) return;

  const { from, to } = getDayWindowUTC();
  const { usedTokens } = await sumUserTokens(academyId, user._id, from, to);
  if (usedTokens >= limitTokens) {
    const err = new Error(AI_ERRORS.USAGE_LIMIT_EXCEEDED);
    err.status = 403;
    err.code = AI_ERRORS.USAGE_LIMIT_EXCEEDED;
    throw err;
  }
};

/**
 * @param {string} academyId
 * @param {Object} user
 * @param {Object} academy
 */
export const getMyAiUsage = async (academyId, user, academy) => {
  const limits = normalizeAiUsageLimits(academy?.aiUsageLimits);
  const { from, to } = getDayWindowUTC();
  const { usedTokens, requests } = await sumUserTokens(
    academyId,
    user._id,
    from,
    to
  );
  const usedAlts = tokensToAlts(usedTokens);
  const limitAlts = limits.enabled ? limits.dailyUserAlts : null;
  const remainingAlts =
    limitAlts != null ? Math.max(0, Math.round((limitAlts - usedAlts) * 1e6) / 1e6) : null;

  return {
    period: "day",
    usedTokens,
    usedAlts,
    requests,
    limitEnabled: limits.enabled,
    limitAlts,
    remainingAlts,
    tokensPerAlt: TOKENS_PER_ALT,
    // 하위 호환 (구 클라이언트)
    limitTokens: limitAlts != null ? altsToTokens(limitAlts) : null,
    remainingTokens:
      limitAlts != null ? Math.max(0, altsToTokens(limitAlts) - usedTokens) : null,
  };
};
