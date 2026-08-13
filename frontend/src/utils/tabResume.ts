/** Reload after this long in the background (covers “a few minutes” freezes). */
export const HIDDEN_RELOAD_MS = 2 * 60 * 1000;

const RELOAD_FLAG_KEY = "altsis-tab-resume-reload";
const RELOAD_FLAG_TTL_MS = 10 * 1000;

export type TabResumeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function shouldReloadAfterHidden(
  hiddenAt: number | null,
  now: number,
  thresholdMs: number = HIDDEN_RELOAD_MS
): boolean {
  if (hiddenAt == null) return false;
  return now - hiddenAt >= thresholdMs;
}

export function shouldReloadOnPageShow(persisted: boolean): boolean {
  return persisted === true;
}

export function shouldSkipReload(
  storage: TabResumeStorage,
  now: number
): boolean {
  const raw = storage.getItem(RELOAD_FLAG_KEY);
  if (!raw) return false;
  storage.removeItem(RELOAD_FLAG_KEY);
  const at = Number(raw);
  if (!Number.isFinite(at)) return true;
  return now - at < RELOAD_FLAG_TTL_MS;
}

export function markReload(storage: TabResumeStorage, now: number): void {
  storage.setItem(RELOAD_FLAG_KEY, String(now));
}

export type InstallTabResumeReloadOptions = {
  reload?: () => void;
  getNow?: () => number;
  storage?: TabResumeStorage | null;
  thresholdMs?: number;
  documentRef?: {
    visibilityState: Document["visibilityState"];
    addEventListener: (type: string, listener: EventListener) => void;
    removeEventListener: (type: string, listener: EventListener) => void;
  };
  windowRef?: {
    addEventListener: (type: string, listener: EventListener) => void;
    removeEventListener: (type: string, listener: EventListener) => void;
  };
};

/**
 * Reloads the page after a long background freeze or bfcache restore.
 * Call once as soon as the JS bundle runs (before React render).
 */
export function installTabResumeReload(
  options: InstallTabResumeReloadOptions = {}
): () => void {
  const reload = options.reload ?? (() => window.location.reload());
  const getNow = options.getNow ?? (() => Date.now());
  const storage =
    options.storage !== undefined
      ? options.storage
      : typeof sessionStorage === "undefined"
        ? null
        : sessionStorage;
  const thresholdMs = options.thresholdMs ?? HIDDEN_RELOAD_MS;
  const doc = options.documentRef ?? document;
  const win = options.windowRef ?? window;

  let hiddenAt: number | null =
    doc.visibilityState === "hidden" ? getNow() : null;

  const tryReload = () => {
    if (storage && shouldSkipReload(storage, getNow())) return;
    if (storage) markReload(storage, getNow());
    reload();
  };

  const onVisibilityChange = () => {
    if (doc.visibilityState === "hidden") {
      hiddenAt = getNow();
      return;
    }
    if (doc.visibilityState !== "visible") return;
    if (shouldReloadAfterHidden(hiddenAt, getNow(), thresholdMs)) {
      tryReload();
    }
    hiddenAt = null;
  };

  const onPageShow = (event: Event) => {
    const persisted = Boolean((event as PageTransitionEvent).persisted);
    if (shouldReloadOnPageShow(persisted)) {
      tryReload();
    }
  };

  doc.addEventListener("visibilitychange", onVisibilityChange);
  win.addEventListener("pageshow", onPageShow);

  return () => {
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    win.removeEventListener("pageshow", onPageShow);
  };
}
