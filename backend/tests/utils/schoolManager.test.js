import { canManageBoard } from "../../src/services/boards.js";
import { canManageSchoolCalendar } from "../../src/utils/calendarAuth.js";
import {
  resolveSchoolAuth,
  findSchoolMembership,
  isSchoolManager,
  isSchoolManagerOf,
  hasAnySchoolManagerRole,
  matchesManagerGroup,
} from "../../src/utils/schoolManager.js";

const schoolA = "school-a-oid";
const schoolB = "school-b-oid";

const user = (auth, schools) => ({ auth, schools });

describe("resolveSchoolAuth", () => {
  test("요청 값을 우선한다", () => {
    expect(resolveSchoolAuth("member", "manager")).toBe("member");
    expect(resolveSchoolAuth("manager", "member")).toBe("manager");
  });

  test("없으면 계정 auth로 기본값을 둔다", () => {
    expect(resolveSchoolAuth(undefined, "manager")).toBe("manager");
    expect(resolveSchoolAuth(undefined, "member")).toBe("member");
    expect(resolveSchoolAuth("nope", "admin")).toBe("member");
  });
});

describe("isSchoolManager", () => {
  test("admin은 모든 학교", () => {
    expect(isSchoolManager(user("admin", []), schoolA)).toBe(true);
    expect(isSchoolManager({ auth: "admin" }, schoolB)).toBe(true);
  });

  test("owner는 학교 관리자가 아니다", () => {
    expect(
      isSchoolManager(
        user("owner", [{ school: schoolA, schoolId: "a" }]),
        schoolA
      )
    ).toBe(false);
  });

  test("schoolAuth manager는 그 학교만", () => {
    const mgr = user("member", [
      { school: schoolA, schoolId: "a", schoolAuth: "manager" },
      { school: schoolB, schoolId: "b", schoolAuth: "member" },
    ]);
    expect(isSchoolManager(mgr, schoolA)).toBe(true);
    expect(isSchoolManager(mgr, "a")).toBe(true);
    expect(isSchoolManager(mgr, schoolB)).toBe(false);
    expect(isSchoolManager(mgr, "b")).toBe(false);
  });

  test("계정 manager여도 schoolAuth member면 그 학교는 아님", () => {
    const mgr = user("manager", [
      { school: schoolA, schoolId: "a", schoolAuth: "manager" },
      { school: schoolB, schoolId: "b", schoolAuth: "member" },
    ]);
    expect(isSchoolManager(mgr, schoolA)).toBe(true);
    expect(isSchoolManager(mgr, schoolB)).toBe(false);
  });

  test("레거시: schoolAuth 없음 + auth manager는 소속 학교 OK", () => {
    const legacy = user("manager", [
      { school: schoolA, schoolId: "a" },
    ]);
    expect(isSchoolManager(legacy, schoolA)).toBe(true);
    expect(isSchoolManager(legacy, schoolB)).toBe(false);
  });

  test("미소속 학교는 아님", () => {
    const member = user("member", [
      { school: schoolA, schoolId: "a", schoolAuth: "member" },
    ]);
    expect(isSchoolManager(member, schoolA)).toBe(false);
    expect(isSchoolManager(member, schoolB)).toBe(false);
  });

  test("멤버 + 소속만이면 학기 API 입구도 거부", () => {
    const member = user("member", [
      { school: schoolA, schoolId: "a", schoolAuth: "member" },
    ]);
    expect(hasAnySchoolManagerRole(member)).toBe(false);
    expect(isSchoolManager(member, schoolA)).toBe(false);
  });

  test("빈 값", () => {
    expect(isSchoolManager(null, schoolA)).toBe(false);
    expect(isSchoolManager(undefined, schoolA)).toBe(false);
    expect(isSchoolManager(user("manager", []), schoolA)).toBe(false);
  });
});

describe("hasAnySchoolManagerRole", () => {
  test("admin", () => {
    expect(hasAnySchoolManagerRole({ auth: "admin" })).toBe(true);
  });

  test("한 학교만 manager이면 true", () => {
    const mgr = user("manager", [
      { school: schoolA, schoolAuth: "manager" },
      { school: schoolB, schoolAuth: "member" },
    ]);
    expect(hasAnySchoolManagerRole(mgr)).toBe(true);
  });

  test("모든 소속이 member이면 계정 manager여도 false", () => {
    const mgr = user("manager", [
      { school: schoolA, schoolAuth: "member" },
    ]);
    expect(hasAnySchoolManagerRole(mgr)).toBe(false);
  });

  test("레거시 manager는 true", () => {
    expect(
      hasAnySchoolManagerRole(
        user("manager", [{ school: schoolA, schoolId: "a" }])
      )
    ).toBe(true);
  });
});

describe("isSchoolManagerOf / matchesManagerGroup", () => {
  const mgr = user("member", [
    { school: schoolA, schoolId: "a", schoolAuth: "manager" },
  ]);

  test("여러 참조 중 하나라도 맞으면 true", () => {
    expect(isSchoolManagerOf(mgr, schoolB, schoolA)).toBe(true);
    expect(isSchoolManagerOf(mgr, schoolB)).toBe(false);
  });

  test("그룹 관리자는 isSchoolManager와 같다", () => {
    expect(matchesManagerGroup(mgr, schoolA)).toBe(true);
    expect(matchesManagerGroup(mgr, schoolB)).toBe(false);
  });
});

describe("findSchoolMembership", () => {
  test("school ObjectId와 schoolId 문자열을 모두 찾는다", () => {
    const row = { school: schoolA, schoolId: "byul", schoolAuth: "manager" };
    const u = user("member", [row]);
    expect(findSchoolMembership(u, schoolA)).toEqual(row);
    expect(findSchoolMembership(u, "byul")).toEqual(row);
    expect(findSchoolMembership(u, schoolB)).toBe(null);
  });
});

describe("타학교 빈틈", () => {
  const mgr = user("manager", [
    { school: schoolA, schoolId: "a", schoolAuth: "manager" },
    { school: schoolB, schoolId: "b", schoolAuth: "member" },
  ]);

  test("A 학기·캘린더 OK, B는 거부", () => {
    expect(isSchoolManager(mgr, schoolA)).toBe(true);
    expect(isSchoolManager(mgr, schoolB)).toBe(false);
    expect(canManageSchoolCalendar(mgr, schoolA)).toBe(true);
    expect(canManageSchoolCalendar(mgr, schoolB)).toBe(false);
  });

  test("B 보드는 생성자·보드 admin이 아니면 canManageBoard false", () => {
    const boardB = { school: schoolB, schoolId: "b", creator: "other" };
    expect(canManageBoard(boardB, { _id: "me", ...mgr })).toBe(false);
    expect(
      canManageBoard({ school: schoolA, schoolId: "a", creator: "other" }, { _id: "me", ...mgr })
    ).toBe(true);
  });

  test("B 수업 수강 매니저 우회 false", () => {
    expect(isSchoolManager(mgr, schoolB)).toBe(false);
  });
});

