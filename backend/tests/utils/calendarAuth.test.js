import {
  canAssignEventToCalendar,
  canManageSchoolCalendar,
  personalEventVisibilityFilter,
  personalCalendarListFilter,
} from "../../src/utils/calendarAuth.js";

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
        { school: "A", schoolAuth: "manager" },
        { school: "B", schoolAuth: "member" },
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
    expect(canManageSchoolCalendar({})).toBe(false);
    expect(canManageSchoolCalendar(null)).toBe(false);
    expect(canManageSchoolCalendar(undefined)).toBe(false);
  });
});

describe("canAssignEventToCalendar", () => {
  const owner = { _id: "u1", auth: "member" };
  const other = { _id: "u2", auth: "member" };
  const manager = {
    _id: "m1",
    auth: "manager",
    schools: [{ school: "s1" }],
  };

  test("학교 캘린더는 해당 학교 관리자만 붙일 수 있다", () => {
    const schoolCal = { scope: "school", user: "x", school: "s1" };
    expect(canAssignEventToCalendar(manager, schoolCal)).toBe(true);
    expect(canAssignEventToCalendar(owner, schoolCal)).toBe(false);
    expect(
      canAssignEventToCalendar(
        {
          _id: "m2",
          auth: "manager",
          schools: [{ school: "s1", schoolAuth: "member" }],
        },
        schoolCal
      )
    ).toBe(false);
  });

  test("개인 캘린더는 소유자만 붙일 수 있다", () => {
    const personal = { scope: "personal", user: "u1" };
    expect(canAssignEventToCalendar(owner, personal)).toBe(true);
    expect(canAssignEventToCalendar(other, personal)).toBe(false);
    expect(canAssignEventToCalendar(manager, personal)).toBe(false);
  });
});

describe("personalEventVisibilityFilter", () => {
  const viewerId = "viewer1";
  const otherId = "other1";
  const privateIds = ["cal1", "cal2"];

  test("본인 조회이면 필터가 없다", () => {
    expect(
      personalEventVisibilityFilter({
        viewerId,
        targetUserId: viewerId,
        privateCalendarIds: privateIds,
      })
    ).toBeNull();
  });

  test("타인 조회이고 비공개 캘린더가 없으면 필터가 없다", () => {
    expect(
      personalEventVisibilityFilter({
        viewerId,
        targetUserId: otherId,
        privateCalendarIds: [],
      })
    ).toBeNull();
  });

  test("타인 조회이면 비공개 캘린더 ID를 제외한다", () => {
    expect(
      personalEventVisibilityFilter({
        viewerId,
        targetUserId: otherId,
        privateCalendarIds: privateIds,
      })
    ).toEqual({
      $or: [
        { calendarId: { $exists: false } },
        { calendarId: null },
        { calendarId: { $nin: privateIds } },
      ],
    });
  });
});

describe("personalCalendarListFilter", () => {
  test("본인 조회이면 isPrivate 조건을 넣지 않는다", () => {
    expect(
      personalCalendarListFilter({
        viewerId: "u1",
        targetUserId: "u1",
      })
    ).toEqual({ user: "u1", scope: "personal" });
  });

  test("타인 조회이면 isPrivate 캘린더를 제외한다", () => {
    expect(
      personalCalendarListFilter({
        viewerId: "u1",
        targetUserId: "u2",
      })
    ).toEqual({
      user: "u2",
      scope: "personal",
      isPrivate: { $ne: true },
    });
  });
});
