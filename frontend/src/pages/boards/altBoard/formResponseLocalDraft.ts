export type FormResponseDraftPayload = {
  data: Record<string, any>;
  savedAt: number;
};

export const FORM_RESPONSE_DRAFT_PREFIX = "alt-form-response-";
export const FORM_RESPONSE_DRAFT_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;
export const FORM_RESPONSE_DRAFT_DEBOUNCE_MS = 1000;
export const FORM_RESPONSE_DRAFT_INTERVAL_MS = 30_000;

export const formResponseDraftStorageKey = (
  userId: string,
  formId: string,
  rowId?: string | null
): string =>
  `${FORM_RESPONSE_DRAFT_PREFIX}${userId}-${formId}-${rowId || "new"}`;

export const readFormResponseDraft = (
  storageKey: string | null | undefined,
  now = Date.now()
): FormResponseDraftPayload | null => {
  if (!storageKey || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormResponseDraftPayload;
    if (!parsed || typeof parsed.savedAt !== "number") {
      localStorage.removeItem(storageKey);
      return null;
    }
    if (now - parsed.savedAt > FORM_RESPONSE_DRAFT_EXPIRE_MS) {
      localStorage.removeItem(storageKey);
      return null;
    }
    if (!parsed.data || typeof parsed.data !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeFormResponseDraft = (
  storageKey: string | null | undefined,
  data: Record<string, any>,
  savedAt = Date.now()
): boolean => {
  if (!storageKey || typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ data, savedAt } satisfies FormResponseDraftPayload)
    );
    return true;
  } catch {
    return false;
  }
};

export const clearFormResponseDraft = (
  storageKey: string | null | undefined
): void => {
  if (!storageKey || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // quota / private mode
  }
};

export const hasFormResponseDraftContent = (
  data: Record<string, any> | null | undefined
): boolean => {
  if (!data) return false;
  return Object.values(data).some((value) => {
    if (value == null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });
};
