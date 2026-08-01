/**
 * Short TTL + in-flight dedup for GET /goals/me
 * (Sidebar widget + Goals page share one request)
 */

import { TGoalsMe } from "types/goals";

const TTL_MS = 30_000;
const INVALIDATE_EVENT = "altsis:goals-cache-invalidate";

const resultCache = new Map<string, { at: number; data: TGoalsMe }>();
const inflight = new Map<string, Promise<TGoalsMe>>();

export function goalsCacheKey(
  schoolId: string,
  seasonId?: string | null,
  userId?: string | null
): string {
  return `${schoolId}:${seasonId || ""}:${userId || ""}`;
}

export function getGoalsCached(
  key: string,
  fetcher: () => Promise<TGoalsMe>
): Promise<TGoalsMe> {
  const hit = resultCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Promise.resolve(hit.data);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetcher()
    .then((data) => {
      resultCache.set(key, { at: Date.now(), data });
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateGoalsCache(key?: string) {
  if (key) {
    resultCache.delete(key);
    inflight.delete(key);
  } else {
    resultCache.clear();
    inflight.clear();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INVALIDATE_EVENT));
  }
}

export function subscribeGoalsCacheInvalidation(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(INVALIDATE_EVENT, handler);
  return () => window.removeEventListener(INVALIDATE_EVENT, handler);
}
