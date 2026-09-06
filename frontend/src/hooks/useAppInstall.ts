import { useCallback, useEffect, useState } from "react";
import {
  AppInstallContext,
  readAppInstallContextFromWindow,
} from "utils/appInstallContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type AppInstallState = AppInstallContext & {
  canPromptInstall: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export function useAppInstall(): AppInstallState {
  const [context, setContext] = useState<AppInstallContext>(() =>
    typeof window === "undefined"
      ? {
          platform: "desktop",
          browser: "other",
          installed: false,
          iosNeedsSafari: false,
        }
      : readAppInstallContextFromWindow()
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const refresh = () => {
      setContext(readAppInstallContextFromWindow());
    };

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      refresh();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const medias = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(display-mode: minimal-ui)"),
    ];
    medias.forEach((mq) => {
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", refresh);
      }
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      medias.forEach((mq) => {
        if (typeof mq.removeEventListener === "function") {
          mq.removeEventListener("change", refresh);
        }
      });
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") {
        setContext(readAppInstallContextFromWindow());
      }
      return outcome;
    } catch {
      setDeferredPrompt(null);
      return "unavailable" as const;
    }
  }, [deferredPrompt]);

  return {
    ...context,
    canPromptInstall: Boolean(deferredPrompt) && !context.installed,
    promptInstall,
  };
}
