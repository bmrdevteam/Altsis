import {
  resolveSchoolAuth,
  findSchoolMembership,
  isSchoolManager,
  isSchoolManagerOf,
  hasAnySchoolManagerRole,
  matchesManagerGroup,
} from "./schoolManager";

const schoolA = "school-a-oid";
const schoolB = "school-b-oid";

const user = (
  auth: string,
  schools: Array<{ school?: string; schoolId?: string; schoolAuth?: "manager" | "member" }>
) => ({ auth, schools });

describe("isSchoolManager", () => {
  test("admin은 모든 학교", () => {
    expect(isSchoolManager(user("admin", []), schoolA)).toBe(true);
  });

  test("owner는 학교 관리자가 아니다", () => {
    expect(
      isSchoolManager(user("owner", [{ school: schoolA, schoolId: "a" }]), schoolA)
    ).toBe(false);
  });

  test("schoolAuth manager는 그 학교만", () => {
    const mgr = user("member", [
      { school: schoolA, schoolId: "a", schoolAuth: "manager" },
      { school: schoolB, schoolId: "b", schoolAuth: "member" },
    ]);
    expect(isSchoolManager(mgr, schoolA)).toBe(true);
    expect(isSchoolManager(mgr, schoolB)).toBe(false);
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
    const legacy = user("manager", [{ school: schoolA, schoolId: "a" }]);
    expect(isSchoolManager(legacy, schoolA)).toBe(true);
    expect(isSchoolManager(legacy, schoolB)).toBe(false);
  });

  test("멤버 + 소속만이면 관리자가 아니다", () => {
    const member = user("member", [
      { school: schoolA, schoolId: "a", schoolAuth: "member" },
    ]);
    expect(hasAnySchoolManagerRole(member)).toBe(false);
    expect(isSchoolManager(member, schoolA)).toBe(false);
  });
});

describe("resolveSchoolAuth / findSchoolMembership / matchesManagerGroup", () => {
  test("요청 값을 우선하고 없으면 계정 auth", () => {
    expect(resolveSchoolAuth("member", "manager")).toBe("member");
    expect(resolveSchoolAuth(undefined, "manager")).toBe("manager");
  });

  test("school ObjectId와 schoolId를 모두 찾는다", () => {
    const row = { school: schoolA, schoolId: "byul", schoolAuth: "manager" as const };
    expect(findSchoolMembership(user("member", [row]), schoolA)).toEqual(row);
    expect(findSchoolMembership(user("member", [row]), "byul")).toEqual(row);
  });

  test("그룹 관리자는 isSchoolManager와 같다", () => {
    const mgr = user("member", [
      { school: schoolA, schoolId: "a", schoolAuth: "manager" },
    ]);
    expect(matchesManagerGroup(mgr, schoolA)).toBe(true);
    expect(isSchoolManagerOf(mgr, schoolB, schoolA)).toBe(true);
  });
});
