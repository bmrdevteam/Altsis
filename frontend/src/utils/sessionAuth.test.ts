import {
  RESUME_CHECK_MIN_INTERVAL_MS,
  decideResumeSessionCheck,
  isSessionAuthFailure,
  loginPathForAcademy,
} from "./sessionAuth";

describe("isSessionAuthFailure", () => {
  test("treats 401 and 403 as auth failure", () => {
    expect(isSessionAuthFailure({ response: { status: 401 } })).toBe(true);
    expect(isSessionAuthFailure({ response: { status: 403 } })).toBe(true);
  });

  test("ignores network and other HTTP errors", () => {
    expect(isSessionAuthFailure(undefined)).toBe(false);
    expect(isSessionAuthFailure({})).toBe(false);
    expect(isSessionAuthFailure({ response: { status: 500 } })).toBe(false);
    expect(isSessionAuthFailure({ message: "Network Error" })).toBe(false);
  });
});

describe("loginPathForAcademy", () => {
  test("uses academy login when id is present", () => {
    expect(loginPathForAcademy("bmr")).toBe("/bmr/login");
  });

  test("falls back to /login without a usable academy id", () => {
    expect(loginPathForAcademy(null)).toBe("/login");
    expect(loginPathForAcademy("")).toBe("/login");
    expect(loginPathForAcademy("0")).toBe("/login");
    expect(loginPathForAcademy("undefined")).toBe("/login");
  });
});

describe("decideResumeSessionCheck", () => {
  const base = {
    loading: false,
    hasUser: true,
    pathname: "/bmr/school/boards",
    inFlight: false,
    lastOkAt: 0,
    now: 60_000,
  };

  test("checks when a logged-in user returns after the interval", () => {
    expect(
      decideResumeSessionCheck({
        ...base,
        lastOkAt: 1_000,
        now: 1_000 + RESUME_CHECK_MIN_INTERVAL_MS,
      })
    ).toBe("check");
  });

  test("skips boot, anonymous, in-flight, login page, and recent success", () => {
    expect(decideResumeSessionCheck({ ...base, loading: true })).toBe("skip");
    expect(decideResumeSessionCheck({ ...base, hasUser: false })).toBe("skip");
    expect(decideResumeSessionCheck({ ...base, inFlight: true })).toBe("skip");
    expect(
      decideResumeSessionCheck({ ...base, pathname: "/bmr/login" })
    ).toBe("skip");
    expect(
      decideResumeSessionCheck({
        ...base,
        lastOkAt: 50_000,
        now: 50_000 + RESUME_CHECK_MIN_INTERVAL_MS - 1,
      })
    ).toBe("skip");
  });
});
