import {
  getLoginPath,
  isLoginPath,
  isPublicPath,
  isUnauthenticatedError,
  redirectToLogin,
  resetLoginRedirectState,
} from "./sessionExpiry";

describe("isLoginPath", () => {
  test("matches academy and global login routes", () => {
    expect(isLoginPath("/login")).toBe(true);
    expect(isLoginPath("/login/")).toBe(true);
    expect(isLoginPath("/bmr/login")).toBe(true);
    expect(isLoginPath("/register")).toBe(true);
  });

  test("does not match authenticated app routes", () => {
    expect(isLoginPath("/bmr/br")).toBe(false);
    expect(isLoginPath("/bmr/br/courses")).toBe(false);
    expect(isLoginPath("/")).toBe(false);
  });
});

describe("isPublicPath", () => {
  test("includes login, register, and public academy sites", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/bmr/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/sites/bmr")).toBe(true);
    expect(isPublicPath("/bmr/br")).toBe(false);
  });
});

describe("getLoginPath", () => {
  test("uses academy id from school-prefixed URLs", () => {
    expect(getLoginPath("/bmr/br")).toBe("/bmr/login");
    expect(getLoginPath("/bmr/br/courses")).toBe("/bmr/login");
  });

  test("falls back to academy picker for known app segments", () => {
    expect(getLoginPath("/login")).toBe("/login");
    expect(getLoginPath("/admin/schools")).toBe("/login");
    expect(getLoginPath("/owner")).toBe("/login");
    expect(getLoginPath("/")).toBe("/login");
  });
});

describe("isUnauthenticatedError", () => {
  test("detects NOT_LOGGED_IN and 401", () => {
    expect(
      isUnauthenticatedError({
        response: { status: 401, data: { message: "NOT_LOGGED_IN" } },
      })
    ).toBe(true);
    expect(isUnauthenticatedError({ response: { status: 401 } })).toBe(true);
  });

  test("does not treat login form failures as session expiry", () => {
    expect(
      isUnauthenticatedError({
        response: { status: 401, data: { message: "PASSWORD_INCORRECT" } },
      })
    ).toBe(false);
    expect(
      isUnauthenticatedError({
        response: { status: 401, data: { message: "USER_NOT_FOUND" } },
      })
    ).toBe(false);
  });

  test("does not log out on ordinary permission errors", () => {
    expect(
      isUnauthenticatedError({
        response: { status: 403, data: { message: "PERMISSION_DENIED" } },
        config: { url: "/api/schools/abc" },
      })
    ).toBe(false);
  });

  test("treats legacy /users/current 403 as expired session", () => {
    expect(
      isUnauthenticatedError({
        response: { status: 403, data: { message: "PERMISSION_DENIED" } },
        config: { url: "https://api.example/api/users/current" },
      })
    ).toBe(true);
    expect(
      isUnauthenticatedError(
        { response: { status: 403, data: { message: "PERMISSION_DENIED" } } },
        { currentUserEndpoint: true }
      )
    ).toBe(true);
  });
});

describe("redirectToLogin", () => {
  afterEach(() => {
    resetLoginRedirectState();
  });

  test("replaces location with academy login and ignores duplicates", () => {
    const assign = jest.fn();
    redirectToLogin("/bmr/br", assign);
    redirectToLogin("/bmr/br", assign);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/bmr/login");
  });

  test("does not navigate when already on a login page", () => {
    const assign = jest.fn();
    redirectToLogin("/bmr/login", assign);
    expect(assign).not.toHaveBeenCalled();
  });

  test("does not navigate away from public academy sites", () => {
    const assign = jest.fn();
    redirectToLogin("/sites/bmr", assign);
    expect(assign).not.toHaveBeenCalled();
  });
});
