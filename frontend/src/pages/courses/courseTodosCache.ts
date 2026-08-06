/**
 * Shared in-flight + short TTL cache for course-todos
 * so Sidebar badge and Courses Index share one request.
 */

export type TCourseTodoKind =
  | "approve"
  | "confirmPending"
  | "evaluation";

export type TCourseTodoSurface = "mentoring" | "created" | "enrolled";

export type TEvalChipLabel = "없음" | "대기" | "평가중" | "완료";

export type TCourseTodoItem = {
  kind: TCourseTodoKind;
  surface: TCourseTodoSurface;
  syllabusId: string;
  syllabusTitle: string;
  missingEvalLabels?: string[];
  evalStatus?: TEvalChipLabel;
  /** @deprecated use evalStatus; kept for older payloads */
  periodOpen?: boolean;
};

export type TCourseTodosResult = {
  items: TCourseTodoItem[];
  count: number;
};

const TTL_MS = 30_000;

const resultCache = new Map<
  string,
  { at: number; data: TCourseTodosResult }
>();
const inflight = new Map<string, Promise<TCourseTodosResult>>();

export function courseTodosCacheKey(
  schoolId: string,
  seasonId?: string | null
): string {
  return `${schoolId}:${seasonId || ""}`;
}

/**
 * Returns cached result if fresh; otherwise shares one in-flight fetch.
 */
export function getCourseTodosCached(
  key: string,
  fetcher: () => Promise<TCourseTodosResult>
): Promise<TCourseTodosResult> {
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

export function invalidateCourseTodosCache(key?: string) {
  if (key) {
    resultCache.delete(key);
    inflight.delete(key);
  } else {
    resultCache.clear();
    inflight.clear();
  }
}
