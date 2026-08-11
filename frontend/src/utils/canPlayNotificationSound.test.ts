import {
  canPlayNotificationSound,
  isStandaloneDisplayMode,
} from "./canPlayNotificationSound";

describe("canPlayNotificationSound", () => {
  test("soundEnabled가 false면 재생 불가", () => {
    expect(
      canPlayNotificationSound({
        soundEnabled: false,
        visibilityState: "visible",
        hasFocus: true,
        isStandalone: false,
      })
    ).toBe(false);
  });

  test("standalone(PWA)이면 재생 불가", () => {
    expect(
      canPlayNotificationSound({
        soundEnabled: true,
        visibilityState: "visible",
        hasFocus: true,
        isStandalone: true,
      })
    ).toBe(false);
  });

  test("visibility가 hidden이면 재생 불가", () => {
    expect(
      canPlayNotificationSound({
        soundEnabled: true,
        visibilityState: "hidden",
        hasFocus: true,
        isStandalone: false,
      })
    ).toBe(false);
  });

  test("포커스가 없으면 재생 불가", () => {
    expect(
      canPlayNotificationSound({
        soundEnabled: true,
        visibilityState: "visible",
        hasFocus: false,
        isStandalone: false,
      })
    ).toBe(false);
  });

  test("브라우저 탭 포그라운드+포커스면 재생 가능", () => {
    expect(
      canPlayNotificationSound({
        soundEnabled: true,
        visibilityState: "visible",
        hasFocus: true,
        isStandalone: false,
      })
    ).toBe(true);
  });
});

describe("isStandaloneDisplayMode", () => {
  test("display-mode: standalone이면 true", () => {
    const matchMedia = (query: string) =>
      ({
        matches: query.includes("standalone"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    expect(isStandaloneDisplayMode(matchMedia, {})).toBe(true);
  });

  test("iOS navigator.standalone이면 true", () => {
    const matchMedia = () =>
      ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    expect(isStandaloneDisplayMode(matchMedia, { standalone: true })).toBe(
      true
    );
  });

  test("일반 브라우저면 false", () => {
    const matchMedia = () =>
      ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    expect(isStandaloneDisplayMode(matchMedia, {})).toBe(false);
  });
});
