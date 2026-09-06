export type AppPlatform = "ios" | "android" | "desktop";

export type AppBrowser =
  | "safari"
  | "chrome"
  | "edge"
  | "samsung"
  | "firefox"
  | "other";

export type AppDisplayMode =
  | "browser"
  | "standalone"
  | "fullscreen"
  | "minimal-ui";

export type AppInstallContextInput = {
  userAgent: string;
  maxTouchPoints?: number;
  displayMode?: AppDisplayMode;
  iosStandalone?: boolean;
};

export type AppInstallContext = {
  platform: AppPlatform;
  browser: AppBrowser;
  installed: boolean;
  iosNeedsSafari: boolean;
};

const INSTALLED_MODES = new Set<AppDisplayMode>([
  "standalone",
  "fullscreen",
  "minimal-ui",
]);

export function detectAppPlatform(
  userAgent: string,
  maxTouchPoints = 0
): AppPlatform {
  const ua = String(userAgent || "");
  if (/iPhone|iPod/i.test(ua)) return "ios";
  if (/iPad/i.test(ua)) return "ios";
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function detectAppBrowser(userAgent: string): AppBrowser {
  const ua = String(userAgent || "");
  if (/CriOS/i.test(ua)) return "chrome";
  if (/FxiOS/i.test(ua)) return "firefox";
  if (/EdgiOS/i.test(ua)) return "edge";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Chrome\//i.test(ua) || /Chromium\//i.test(ua)) return "chrome";
  if (/Safari\//i.test(ua) && /Version\//i.test(ua)) return "safari";
  return "other";
}

export function detectAppInstallContext(
  input: AppInstallContextInput
): AppInstallContext {
  const platform = detectAppPlatform(input.userAgent, input.maxTouchPoints ?? 0);
  const browser = detectAppBrowser(input.userAgent);
  const installed =
    Boolean(input.iosStandalone) ||
    INSTALLED_MODES.has(input.displayMode ?? "browser");
  const iosNeedsSafari = platform === "ios" && browser !== "safari" && !installed;

  return { platform, browser, installed, iosNeedsSafari };
}

export function appPlatformLabel(platform: AppPlatform): string {
  if (platform === "ios") return "iPhone / iPad";
  if (platform === "android") return "Android";
  return "컴퓨터";
}

export function appBrowserLabel(browser: AppBrowser): string {
  if (browser === "safari") return "Safari";
  if (browser === "chrome") return "Chrome";
  if (browser === "edge") return "Edge";
  if (browser === "samsung") return "Samsung Internet";
  if (browser === "firefox") return "Firefox";
  return "브라우저";
}

export function readDisplayMode(
  matchMediaFn?: (query: string) => { matches: boolean }
): AppDisplayMode {
  const mm = matchMediaFn ?? (typeof window !== "undefined" ? window.matchMedia.bind(window) : undefined);
  if (!mm) return "browser";
  if (mm("(display-mode: standalone)").matches) return "standalone";
  if (mm("(display-mode: fullscreen)").matches) return "fullscreen";
  if (mm("(display-mode: minimal-ui)").matches) return "minimal-ui";
  return "browser";
}

export function readAppInstallContextFromWindow(
  win: Window & { navigator: Navigator & { standalone?: boolean } } = window
): AppInstallContext {
  return detectAppInstallContext({
    userAgent: win.navigator.userAgent || "",
    maxTouchPoints: win.navigator.maxTouchPoints || 0,
    displayMode: readDisplayMode(win.matchMedia.bind(win)),
    iosStandalone: Boolean(win.navigator.standalone),
  });
}
