import { canManageSchoolCalendar } from "./calendarAuth";

describe("canManageSchoolCalendar", () => {
  test("owner, admin, manager는 허용한다", () => {
    expect(canManageSchoolCalendar({ auth: "owner" })).toBe(true);
    expect(canManageSchoolCalendar({ auth: "admin" })).toBe(true);
    expect(canManageSchoolCalendar({ auth: "manager" })).toBe(true);
  });

  test("member와 빈 값은 거부한다", () => {
    expect(canManageSchoolCalendar({ auth: "member" })).toBe(false);
    expect(canManageSchoolCalendar({ auth: "" })).toBe(false);
    expect(canManageSchoolCalendar({})).toBe(false);
    expect(canManageSchoolCalendar(null)).toBe(false);
    expect(canManageSchoolCalendar(undefined)).toBe(false);
  });
});
