import {
  canManageSchoolGoals,
  goalsSidebarMode,
  isGoalsFeatureEnabled,
  schoolGoalsSettingsPath,
} from "./goalSidebarVisibility";

describe("isGoalsFeatureEnabled", () => {
  test("undefined/true are on, false is off", () => {
    expect(isGoalsFeatureEnabled(undefined)).toBe(true);
    expect(isGoalsFeatureEnabled(true)).toBe(true);
    expect(isGoalsFeatureEnabled(false)).toBe(false);
  });
});

describe("canManageSchoolGoals", () => {
  test("admin and manager only", () => {
    expect(canManageSchoolGoals("admin")).toBe(true);
    expect(canManageSchoolGoals("manager")).toBe(true);
    expect(canManageSchoolGoals("member")).toBe(false);
    expect(canManageSchoolGoals("owner")).toBe(false);
    expect(canManageSchoolGoals(undefined)).toBe(false);
  });
});

describe("goalsSidebarMode", () => {
  test("no school → hidden", () => {
    expect(goalsSidebarMode({ goalsEnabled: true, auth: "admin" })).toBe(
      "hidden"
    );
  });

  test("feature on → active even for members (empty chips still have an entry)", () => {
    expect(
      goalsSidebarMode({
        schoolId: "s1",
        goalsEnabled: true,
        auth: "member",
      })
    ).toBe("active");
    expect(
      goalsSidebarMode({
        schoolId: "s1",
        auth: "member",
      })
    ).toBe("active");
  });

  test("feature off → hidden for members, disabled entry for school admins", () => {
    expect(
      goalsSidebarMode({
        schoolId: "s1",
        goalsEnabled: false,
        auth: "member",
      })
    ).toBe("hidden");
    expect(
      goalsSidebarMode({
        schoolId: "s1",
        goalsEnabled: false,
        auth: "manager",
      })
    ).toBe("disabled");
    expect(
      goalsSidebarMode({
        schoolId: "s1",
        goalsEnabled: false,
        auth: "admin",
      })
    ).toBe("disabled");
  });
});

describe("schoolGoalsSettingsPath", () => {
  test("opens the school 목표 tab", () => {
    expect(schoolGoalsSettingsPath("abc")).toBe("/admin/schools/abc#목표");
  });
});
