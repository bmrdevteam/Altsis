/**
 * School dashboard helpers — period ranges, deltas, query parsing.
 */
import { tokensToAlts, TOKENS_PER_ALT } from "./aiUsageQuota.js";

const ALLOWED_PERIODS = new Set([7, 14, 30]);
const ALLOWED_SCOPES = new Set(["school", "academy"]);

/**
 * @param {unknown} rawPeriod
 * @param {unknown} rawScope
 * @returns {{ period: 7|14|30, scope: "school"|"academy" }}
 */
export const parseDashboardQuery = (rawPeriod, rawScope) => {
  const periodNum = Number(rawPeriod);
  const period = ALLOWED_PERIODS.has(periodNum) ? periodNum : 7;
  const scope =
    typeof rawScope === "string" && ALLOWED_SCOPES.has(rawScope)
      ? rawScope
      : "school";
  return { period, scope };
};

/**
 * Inclusive UTC date strings (YYYY-MM-DD) for the last `period` days ending today.
 * Matches RequestStat keys written via `toISOString().slice(0, 10)`.
 * @param {number} period
 * @param {Date} [now]
 * @returns {string[]}
 */
export const getDateKeys = (period, now = new Date()) => {
  const dates = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(12, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(toDateKey(d));
  }
  return dates;
};

/**
 * Previous window of the same length, ending the day before current window starts (UTC).
 * @param {number} period
 * @param {Date} [now]
 * @returns {string[]}
 */
export const getPreviousDateKeys = (period, now = new Date()) => {
  const dates = [];
  for (let i = period * 2 - 1; i >= period; i--) {
    const d = new Date(now);
    d.setUTCHours(12, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(toDateKey(d));
  }
  return dates;
};

/**
 * UTC calendar day key — same format as RequestStat / requestTracker.
 * @param {Date} d
 * @returns {string}
 */
export const toDateKey = (d) => d.toISOString().slice(0, 10);

/**
 * Absolute change; null when previous is unavailable.
 * @param {number} current
 * @param {number|null|undefined} previous
 * @returns {number|null}
 */
export const absoluteDelta = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  return current - previous;
};

/**
 * Percent change rounded to 1 decimal; null when previous is 0 or missing.
 * @param {number} current
 * @param {number|null|undefined} previous
 * @returns {number|null}
 */
export const percentDelta = (current, previous) => {
  if (previous === null || previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

/**
 * Aggregate traffic rows into totals used for period comparison.
 * @param {{ requests: number, avgResponseTime: number, dataOut: number, uniqueUsers: number }[]} stats
 */
export const aggregateTraffic = (stats) => {
  const totalRequests = stats.reduce((s, d) => s + (d.requests || 0), 0);
  const totalDataOut = stats.reduce((s, d) => s + (d.dataOut || 0), 0);
  const totalUniqueUsers = stats.reduce((s, d) => s + (d.uniqueUsers || 0), 0);
  const avgResponseTime =
    totalRequests > 0
      ? Math.round(
          stats.reduce(
            (s, d) => s + (d.avgResponseTime || 0) * (d.requests || 0),
            0
          ) / totalRequests
        )
      : 0;
  return {
    requests: totalRequests,
    avgResponseTime,
    dataOut: totalDataOut,
    uniqueUsers: totalUniqueUsers,
  };
};

/**
 * @param {{ requests: number, totalTokens: number }[]} daily
 */
export const aggregateAiDaily = (daily) => {
  return {
    requests: daily.reduce((s, d) => s + (d.requests || 0), 0),
    totalTokens: daily.reduce((s, d) => s + (d.totalTokens || 0), 0),
  };
};

/**
 * Build delta object with absolute + percent for each numeric field.
 * @param {Record<string, number>} current
 * @param {Record<string, number>|null} previous
 * @returns {Record<string, { absolute: number|null, percent: number|null }>}
 */
export const buildFieldDeltas = (current, previous) => {
  const out = {};
  for (const key of Object.keys(current)) {
    const prevVal = previous ? previous[key] : null;
    out[key] = {
      absolute: absoluteDelta(current[key], prevVal),
      percent: percentDelta(current[key], prevVal),
    };
  }
  return out;
};

/**
 * Aggregate period AI logs into top users and feature breakdown (Alt units).
 * @param {Array<{ userId?: string, userName?: string, feature?: string, totalTokens?: number }>} logs
 * @param {number} [topN=10]
 */
export const aggregateAiPeriodDetails = (logs = [], topN = 10) => {
  const byUser = new Map();
  const byFeature = new Map();
  let totalTokens = 0;

  for (const log of logs) {
    const tokens = log.totalTokens || 0;
    totalTokens += tokens;

    const uid = log.userId || String(log.user || "unknown");
    const existingUser = byUser.get(uid) || {
      userId: uid,
      userName: log.userName || uid,
      requests: 0,
      totalTokens: 0,
    };
    existingUser.requests += 1;
    existingUser.totalTokens += tokens;
    if (log.userName) existingUser.userName = log.userName;
    byUser.set(uid, existingUser);

    const feature = log.feature || "unknown";
    const existingFeature = byFeature.get(feature) || {
      feature,
      requests: 0,
      totalTokens: 0,
    };
    existingFeature.requests += 1;
    existingFeature.totalTokens += tokens;
    byFeature.set(feature, existingFeature);
  }

  const withAlts = (row) => ({
    ...row,
    totalAlts: tokensToAlts(row.totalTokens),
  });

  const topUsers = [...byUser.values()]
    .map(withAlts)
    .sort(
      (a, b) =>
        b.totalTokens - a.totalTokens || b.requests - a.requests
    )
    .slice(0, topN);

  const byFeatureList = [...byFeature.values()]
    .map(withAlts)
    .sort((a, b) => b.totalTokens - a.totalTokens);

  return {
    totalAlts: tokensToAlts(totalTokens),
    tokensPerAlt: TOKENS_PER_ALT,
    topUsers,
    byFeature: byFeatureList,
  };
};
