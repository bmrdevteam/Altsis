import {
  clearLastContext,
  homeSchoolId,
  lastRegistrationFor,
  lastSchool,
  pickRegistration,
  rememberRegistration,
  rememberSchool,
} from "./lastContext";

describe("lastContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("remembers and reads last school", () => {
    rememberSchool("school-a");
    expect(lastSchool()).toBe("school-a");
  });

  test("keeps last registration per school", () => {
    rememberRegistration("school-a", "reg-1");
    rememberRegistration("school-b", "reg-2");
    expect(lastRegistrationFor("school-a")).toBe("reg-1");
    expect(lastRegistrationFor("school-b")).toBe("reg-2");
  });

  test("overwrites registration for the same school only", () => {
    rememberRegistration("school-a", "reg-1");
    rememberRegistration("school-a", "reg-9");
    rememberRegistration("school-b", "reg-2");
    expect(lastRegistrationFor("school-a")).toBe("reg-9");
    expect(lastRegistrationFor("school-b")).toBe("reg-2");
  });

  test("returns empty map pieces when JSON is broken", () => {
    localStorage.setItem("altsis.lastRegistrationBySchool", "{not-json");
    expect(lastRegistrationFor("school-a")).toBeNull();
  });

  test("clearLastContext removes school and registration map", () => {
    rememberSchool("school-a");
    rememberRegistration("school-a", "reg-1");
    clearLastContext();
    expect(lastSchool()).toBeNull();
    expect(lastRegistrationFor("school-a")).toBeNull();
  });

  test("ignores empty ids", () => {
    rememberSchool("");
    rememberRegistration("", "reg-1");
    rememberRegistration("school-a", "");
    expect(lastSchool()).toBeNull();
    expect(lastRegistrationFor("school-a")).toBeNull();
  });
});

describe("pickRegistration", () => {
  const regs = [
    { _id: "q1", period: { start: "2026-03-02", end: "2026-05-01" } },
    { _id: "q2", period: { start: "2026-05-11", end: "2026-07-10" } },
    { _id: "q3", period: { start: "2026-08-10", end: "2026-10-14" } },
  ];

  test("prefers the registration whose period contains today", () => {
    expect(pickRegistration(regs, "2026-08-31")?._id).toBe("q3");
    expect(pickRegistration(regs, "2026-06-01")?._id).toBe("q2");
  });

  test("falls back to latest period.end when today is outside all periods", () => {
    expect(pickRegistration(regs, "2026-01-01")?._id).toBe("q3");
  });

  test("skips registrations without period when looking for today", () => {
    const mixed = [
      { _id: "no-period" },
      { _id: "q2", period: { start: "2026-05-11", end: "2026-07-10" } },
    ];
    expect(pickRegistration(mixed, "2026-06-01")?._id).toBe("q2");
  });

  test("returns undefined for an empty list", () => {
    expect(pickRegistration([], "2026-08-31")).toBeUndefined();
  });
});

describe("homeSchoolId", () => {
  const user = {
    schools: [
      { school: "oid-a", schoolId: "alpha" },
      { school: "oid-b", schoolId: "beta" },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  test("uses current school slug first", () => {
    rememberSchool("oid-b");
    expect(homeSchoolId(user, { schoolId: "alpha", _id: "oid-a" })).toBe(
      "alpha"
    );
  });

  test("uses last stored school when current school has no slug", () => {
    rememberSchool("oid-b");
    expect(homeSchoolId(user, undefined)).toBe("beta");
  });

  test("matches last school by slug as well as object id", () => {
    rememberSchool("beta");
    expect(homeSchoolId(user, undefined)).toBe("beta");
  });

  test("falls back to the first school", () => {
    expect(homeSchoolId(user, undefined)).toBe("alpha");
  });
});
