import { isSessionAuthFailure, loginPathForAcademy } from "./sessionAuth";

describe("isSessionAuthFailure", () => {
  test("401/403이면 true", () => {
    expect(isSessionAuthFailure({ response: { status: 401 } })).toBe(true);
    expect(isSessionAuthFailure({ response: { status: 403 } })).toBe(true);
  });

  test("네트워크 오류(응답 없음)는 false", () => {
    expect(isSessionAuthFailure({})).toBe(false);
    expect(isSessionAuthFailure({ message: "Network Error" })).toBe(false);
  });

  test("500 등은 false", () => {
    expect(isSessionAuthFailure({ response: { status: 500 } })).toBe(false);
  });
});

describe("loginPathForAcademy", () => {
  test("academyId가 있으면 학교 로그인 경로", () => {
    expect(loginPathForAcademy("bmr")).toBe("/bmr/login");
  });

  test("없으면 /login", () => {
    expect(loginPathForAcademy()).toBe("/login");
    expect(loginPathForAcademy("")).toBe("/login");
    expect(loginPathForAcademy(null)).toBe("/login");
  });
});
