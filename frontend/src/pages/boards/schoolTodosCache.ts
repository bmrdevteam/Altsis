/**
 * Shared in-flight + short TTL cache for school-todos
 * so Sidebar badge and Boards Index share one request.
 */

export type TSchoolTodoItem = {
  kind: "approve" | "outgoing" | "unsubmitted";
  boardId: string;
  boardTitle: string;
  formId: string;
  formTitle: string;
  rowId?: string;
  fieldId?: string;
  fieldLabel?: string;
  stepLabel?: string;
  respondentName?: string;
  respondentId?: string;
  currentApproverName?: string;
  currentApproverId?: string;
  currentStep?: number;
  totalSteps?: number;
  progress?: string;
  myResponseCount?: number;
  requiredResponseCount?: number | null;
  submittedAt?: string;
};

export type TSchoolTodosResult = {
  items: TSchoolTodoItem[];
  count: number;
};

const TTL_MS = 30_000;

const resultCache = new Map<
  string,
  { at: number; data: TSchoolTodosResult }
>();
const inflight = new Map<string, Promise<TSchoolTodosResult>>();

export function schoolTodosCacheKey(
  schoolId: string,
  seasonId?: string | null
): string {
  return `${schoolId}:${seasonId || ""}`;
}

/**
 * Returns cached result if fresh; otherwise shares one in-flight fetch.
 */
export function getSchoolTodosCached(
  key: string,
  fetcher: () => Promise<TSchoolTodosResult>
): Promise<TSchoolTodosResult> {
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

export function invalidateSchoolTodosCache(key?: string) {
  if (key) {
    resultCache.delete(key);
    inflight.delete(key);
  } else {
    resultCache.clear();
    inflight.clear();
  }
}
