import {
  appBrowserLabel,
  appPlatformLabel,
  detectAppBrowser,
  detectAppInstallContext,
  detectAppPlatform,
  readDisplayMode,
} from "./appInstallContext";

const UA = {
  iosSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
  iosFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15",
  iosEdge:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0.2210.86 Version/17.0 Mobile/15E148 Safari/604.1",
  iPadSafari:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  iPadOsSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36",
  androidSamsung:
    "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/110.0.5481.154 Mobile Safari/537.36",
  desktopEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  desktopFirefox:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:121.0) Gecko/20100101 Firefox/121.0",
  desktopSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
};

describe("detectAppPlatform", () => {
  test("detects iPhone and iPad", () => {
    expect(detectAppPlatform(UA.iosSafari)).toBe("ios");
    expect(detectAppPlatform(UA.iPadSafari)).toBe("ios");
  });

  test("treats iPadOS desktop UA with touch as ios", () => {
    expect(detectAppPlatform(UA.iPadOsSafari, 5)).toBe("ios");
    expect(detectAppPlatform(UA.iPadOsSafari, 0)).toBe("desktop");
  });

  test("detects Android and desktop", () => {
    expect(detectAppPlatform(UA.androidChrome)).toBe("android");
    expect(detectAppPlatform(UA.desktopChrome)).toBe("desktop");
  });

  test("empty UA is desktop", () => {
    expect(detectAppPlatform("")).toBe("desktop");
  });
});

describe("detectAppBrowser", () => {
  test("classifies common browsers", () => {
    expect(detectAppBrowser(UA.iosSafari)).toBe("safari");
    expect(detectAppBrowser(UA.iosChrome)).toBe("chrome");
    expect(detectAppBrowser(UA.iosFirefox)).toBe("firefox");
    expect(detectAppBrowser(UA.iosEdge)).toBe("edge");
    expect(detectAppBrowser(UA.androidChrome)).toBe("chrome");
    expect(detectAppBrowser(UA.androidSamsung)).toBe("samsung");
    expect(detectAppBrowser(UA.desktopEdge)).toBe("edge");
    expect(detectAppBrowser(UA.desktopChrome)).toBe("chrome");
    expect(detectAppBrowser(UA.desktopFirefox)).toBe("firefox");
    expect(detectAppBrowser(UA.desktopSafari)).toBe("safari");
  });

  test("unknown UA is other", () => {
    expect(detectAppBrowser("")).toBe("other");
    expect(detectAppBrowser("CustomClient/1.0")).toBe("other");
  });
});

describe("detectAppInstallContext", () => {
  test("iOS Safari is not installed in the browser", () => {
    const ctx = detectAppInstallContext({ userAgent: UA.iosSafari });
    expect(ctx).toEqual({
      platform: "ios",
      browser: "safari",
      installed: false,
      iosNeedsSafari: false,
    });
  });

  test("iOS Chrome asks to open Safari", () => {
    const ctx = detectAppInstallContext({ userAgent: UA.iosChrome });
    expect(ctx.platform).toBe("ios");
    expect(ctx.browser).toBe("chrome");
    expect(ctx.iosNeedsSafari).toBe(true);
    expect(ctx.installed).toBe(false);
  });

  test("Android Chrome is not installed by default", () => {
    const ctx = detectAppInstallContext({ userAgent: UA.androidChrome });
    expect(ctx.platform).toBe("android");
    expect(ctx.browser).toBe("chrome");
    expect(ctx.installed).toBe(false);
    expect(ctx.iosNeedsSafari).toBe(false);
  });

  test("desktop Edge is not installed by default", () => {
    const ctx = detectAppInstallContext({ userAgent: UA.desktopEdge });
    expect(ctx.platform).toBe("desktop");
    expect(ctx.browser).toBe("edge");
    expect(ctx.installed).toBe(false);
  });

  test("standalone display mode means installed", () => {
    const ctx = detectAppInstallContext({
      userAgent: UA.androidChrome,
      displayMode: "standalone",
    });
    expect(ctx.installed).toBe(true);
  });

  test("iOS navigator.standalone means installed", () => {
    const ctx = detectAppInstallContext({
      userAgent: UA.iosSafari,
      iosStandalone: true,
    });
    expect(ctx.installed).toBe(true);
    expect(ctx.iosNeedsSafari).toBe(false);
  });

  test("installed iOS Chrome does not ask for Safari", () => {
    const ctx = detectAppInstallContext({
      userAgent: UA.iosChrome,
      displayMode: "standalone",
    });
    expect(ctx.installed).toBe(true);
    expect(ctx.iosNeedsSafari).toBe(false);
  });
});

describe("labels and display mode", () => {
  test("labels stay Korean or product names", () => {
    expect(appPlatformLabel("ios")).toBe("iPhone / iPad");
    expect(appPlatformLabel("android")).toBe("Android");
    expect(appPlatformLabel("desktop")).toBe("컴퓨터");
    expect(appBrowserLabel("samsung")).toBe("Samsung Internet");
    expect(appBrowserLabel("other")).toBe("브라우저");
  });

  test("readDisplayMode prefers standalone then fullscreen", () => {
    const matches = (query: string) => ({
      matches: query.includes("fullscreen"),
    });
    expect(readDisplayMode(matches)).toBe("fullscreen");
    expect(readDisplayMode(() => ({ matches: false }))).toBe("browser");
  });
});
