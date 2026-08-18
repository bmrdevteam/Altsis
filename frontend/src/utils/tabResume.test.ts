import {
  installTabResumeListener,
  shouldNotifyOnPageShow,
} from "./tabResume";

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

describe("shouldNotifyOnPageShow", () => {
  test("only bfcache restores notify", () => {
    expect(shouldNotifyOnPageShow(false)).toBe(false);
    expect(shouldNotifyOnPageShow(true)).toBe(true);
  });
});

describe("installTabResumeListener", () => {
  test("notifies after returning from hidden", () => {
    const onResume = jest.fn();
    const doc = fakeDoc("visible");
    const win = fakeWin();

    const uninstall = installTabResumeListener(onResume, {
      documentRef: doc,
      windowRef: win,
    });

    doc.emit("visibilitychange", "hidden");
    expect(onResume).not.toHaveBeenCalled();
    doc.emit("visibilitychange", "visible");
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledWith("visible");

    uninstall();
  });

  test("does not notify a visible event without a hidden interval", () => {
    const onResume = jest.fn();
    const doc = fakeDoc("visible");
    const win = fakeWin();

    installTabResumeListener(onResume, {
      documentRef: doc,
      windowRef: win,
    });

    doc.emit("visibilitychange", "visible");
    expect(onResume).not.toHaveBeenCalled();
  });

  test("notifies on bfcache restore", () => {
    const onResume = jest.fn();
    const doc = fakeDoc("visible");
    const win = fakeWin();

    installTabResumeListener(onResume, {
      documentRef: doc,
      windowRef: win,
    });

    win.emit("pageshow", false);
    expect(onResume).not.toHaveBeenCalled();
    win.emit("pageshow", true);
    expect(onResume).toHaveBeenCalledWith("bfcache");
  });

  test("stops after uninstall", () => {
    const onResume = jest.fn();
    const doc = fakeDoc("visible");
    const win = fakeWin();

    const uninstall = installTabResumeListener(onResume, {
      documentRef: doc,
      windowRef: win,
    });
    uninstall();

    doc.emit("visibilitychange", "hidden");
    doc.emit("visibilitychange", "visible");
    win.emit("pageshow", true);
    expect(onResume).not.toHaveBeenCalled();
  });
});
