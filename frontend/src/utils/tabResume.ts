export type TabResumeReason = "visible" | "bfcache";

export type TabResumeDocumentRef = {
  visibilityState: Document["visibilityState"];
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

export type TabResumeWindowRef = {
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

export type InstallTabResumeListenerOptions = {
  documentRef?: TabResumeDocumentRef;
  windowRef?: TabResumeWindowRef;
};

export function shouldNotifyOnPageShow(persisted: boolean): boolean {
  return persisted === true;
}

/**
 * Notifies when the tab returns from the background or bfcache.
 * Does not reload. Callers decide whether to revalidate session.
 */
export function installTabResumeListener(
  onResume: (reason: TabResumeReason) => void,
  options: InstallTabResumeListenerOptions = {}
): () => void {
  const doc = options.documentRef ?? document;
  const win = options.windowRef ?? window;

  let wasHidden = doc.visibilityState === "hidden";

  const onVisibilityChange = () => {
    if (doc.visibilityState === "hidden") {
      wasHidden = true;
      return;
    }
    if (doc.visibilityState !== "visible" || !wasHidden) return;
    wasHidden = false;
    onResume("visible");
  };

  const onPageShow = (event: Event) => {
    const persisted = Boolean((event as PageTransitionEvent).persisted);
    if (!shouldNotifyOnPageShow(persisted)) return;
    wasHidden = false;
    onResume("bfcache");
  };

  doc.addEventListener("visibilitychange", onVisibilityChange);
  win.addEventListener("pageshow", onPageShow);

  return () => {
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    win.removeEventListener("pageshow", onPageShow);
  };
}
