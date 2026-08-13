import {
  HIDDEN_RELOAD_MS,
  installTabResumeReload,
  markReload,
  shouldReloadAfterHidden,
  shouldReloadOnPageShow,
  shouldSkipReload,
} from "./tabResume";

function memoryStorage() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
}

describe("shouldReloadAfterHidden", () => {
  test("reloads after 2 minutes in the background", () => {
    expect(shouldReloadAfterHidden(0, 1_000)).toBe(false);
    expect(shouldReloadAfterHidden(null, 120_000)).toBe(false);
    expect(shouldReloadAfterHidden(1_000, 1_000 + 119_999)).toBe(false);
    expect(shouldReloadAfterHidden(1_000, 1_000 + HIDDEN_RELOAD_MS)).toBe(true);
  });
});

describe("shouldReloadOnPageShow", () => {
  test("only bfcache restores reload", () => {
    expect(shouldReloadOnPageShow(false)).toBe(false);
    expect(shouldReloadOnPageShow(true)).toBe(true);
  });
});

describe("shouldSkipReload", () => {
  test("skips a second reload within the flag TTL", () => {
    const storage = memoryStorage();
    markReload(storage, 1_000);
    expect(shouldSkipReload(storage, 2_000)).toBe(true);
    expect(shouldSkipReload(storage, 3_000)).toBe(false);
  });

  test("ignores a stale flag", () => {
    const storage = memoryStorage();
    markReload(storage, 1_000);
    expect(shouldSkipReload(storage, 1_000 + 11_000)).toBe(false);
  });
});

describe("installTabResumeReload", () => {
  function fakeDoc(initial: Document["visibilityState"] = "visible") {
    const listeners: Record<string, EventListener[]> = {};
    const doc = {
      visibilityState: initial,
      addEventListener: (type: string, listener: EventListener) => {
        (listeners[type] ??= []).push(listener);
      },
      removeEventListener: (type: string, listener: EventListener) => {
        listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
      },
      emit(type: string, visibilityState?: Document["visibilityState"]) {
        if (visibilityState) doc.visibilityState = visibilityState;
        for (const listener of listeners[type] ?? []) {
          listener(new Event(type));
        }
      },
    };
    return doc;
  }

  function fakeWin() {
    const listeners: Record<string, EventListener[]> = {};
    return {
      addEventListener: (type: string, listener: EventListener) => {
        (listeners[type] ??= []).push(listener);
      },
      removeEventListener: (type: string, listener: EventListener) => {
        listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
      },
      emit(type: string, persisted = false) {
        const event = new Event(type) as PageTransitionEvent;
        Object.defineProperty(event, "persisted", { value: persisted });
        for (const listener of listeners[type] ?? []) {
          listener(event);
        }
      },
    };
  }

  test("reloads when becoming visible after the threshold", () => {
    const reload = jest.fn();
    let now = 0;
    const doc = fakeDoc("visible");
    const win = fakeWin();
    const storage = memoryStorage();

    const uninstall = installTabResumeReload({
      reload,
      getNow: () => now,
      storage,
      documentRef: doc,
      windowRef: win,
    });

    doc.emit("visibilitychange", "hidden");
    now = HIDDEN_RELOAD_MS;
    doc.emit("visibilitychange", "visible");
    expect(reload).toHaveBeenCalledTimes(1);

    uninstall();
  });

  test("does not reload after a short background interval", () => {
    const reload = jest.fn();
    let now = 0;
    const doc = fakeDoc("visible");
    const win = fakeWin();

    installTabResumeReload({
      reload,
      getNow: () => now,
      storage: memoryStorage(),
      documentRef: doc,
      windowRef: win,
    });

    doc.emit("visibilitychange", "hidden");
    now = 30_000;
    doc.emit("visibilitychange", "visible");
    expect(reload).not.toHaveBeenCalled();
  });

  test("reloads on bfcache restore and skips a loop", () => {
    const reload = jest.fn();
    const now = 5_000;
    const doc = fakeDoc("visible");
    const win = fakeWin();
    const storage = memoryStorage();

    installTabResumeReload({
      reload,
      getNow: () => now,
      storage,
      documentRef: doc,
      windowRef: win,
    });

    win.emit("pageshow", true);
    expect(reload).toHaveBeenCalledTimes(1);

    win.emit("pageshow", true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test("continues without storage when sessionStorage is unavailable", () => {
    const reload = jest.fn();
    const now = 5_000;
    const doc = fakeDoc("visible");
    const win = fakeWin();

    installTabResumeReload({
      reload,
      getNow: () => now,
      storage: null,
      documentRef: doc,
      windowRef: win,
    });

    win.emit("pageshow", true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
