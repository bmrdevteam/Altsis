import { canManageSchoolCalendar } from "./calendarAuth";

describe("canManageSchoolCalendar", () => {
  test("admin은 모든 학교", () => {
    expect(canManageSchoolCalendar({ auth: "admin" }, "s1")).toBe(true);
  });

  test("owner는 학교 캘린더를 못 바꾼다", () => {
    expect(canManageSchoolCalendar({ auth: "owner" }, "s1")).toBe(false);
  });

  test("A 관리·B 멤버면 B는 거부한다", () => {
    const mgr = {
      auth: "manager",
      schools: [
        { school: "A", schoolAuth: "manager" as const },
        { school: "B", schoolAuth: "member" as const },
      ],
    };
    expect(canManageSchoolCalendar(mgr, "A")).toBe(true);
    expect(canManageSchoolCalendar(mgr, "B")).toBe(false);
  });

  test("레거시 manager는 소속 학교만", () => {
    const legacy = { auth: "manager", schools: [{ school: "A" }] };
    expect(canManageSchoolCalendar(legacy, "A")).toBe(true);
    expect(canManageSchoolCalendar(legacy, "B")).toBe(false);
    expect(canManageSchoolCalendar({ auth: "manager" })).toBe(false);
  });

  test("member와 빈 값은 거부한다", () => {
    expect(canManageSchoolCalendar({ auth: "member" }, "s1")).toBe(false);
    expect(canManageSchoolCalendar(null)).toBe(false);
    expect(canManageSchoolCalendar(undefined)).toBe(false);
  });
});
