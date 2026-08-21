import { formatMemberIdentity, memberMatchesQuery } from "./memberLabel";

describe("formatMemberIdentity", () => {
  test("formats name, id, role, grade, and group in order", () => {
    expect(
      formatMemberIdentity({
        userName: "조은길",
        userId: "stu01",
        role: "student",
        grade: "1학년",
        group: "1반",
      })
    ).toBe("조은길(stu01)[학생/1학년/1반]");
  });

  test("distinguishes homonyms by userId and grade", () => {
    const a = formatMemberIdentity({
      userName: "조은길",
      userId: "eungil",
      role: "teacher",
      group: "교육지원실",
    });
    const b = formatMemberIdentity({
      userName: "조은길",
      userId: "stu01",
      role: "student",
      grade: "1학년",
    });
    expect(a).toBe("조은길(eungil)[교사/교육지원실]");
    expect(b).toBe("조은길(stu01)[학생/1학년]");
    expect(a).not.toBe(b);
  });

  test("omits empty grade and group without slashes", () => {
    expect(
      formatMemberIdentity({
        userName: "조은길",
        userId: "eungil",
        role: "teacher",
        grade: "",
        group: "교육지원실",
      })
    ).toBe("조은길(eungil)[교사/교육지원실]");
    expect(
      formatMemberIdentity({
        userName: "조은길",
        userId: "eungil",
        role: "teacher",
      })
    ).toBe("조은길(eungil)[교사]");
    expect(
      formatMemberIdentity({
        userName: "조은길",
        userId: "admin01",
      })
    ).toBe("조은길(admin01)");
  });

  test("does not emit double or trailing slashes", () => {
    const label = formatMemberIdentity({
      userName: "조은길",
      userId: "eungil",
      role: "teacher",
      grade: "  ",
      group: "1반",
    });
    expect(label).toBe("조은길(eungil)[교사/1반]");
    expect(label).not.toContain("//");
    expect(label).not.toMatch(/\/]/);
  });
});

describe("memberMatchesQuery", () => {
  const member = {
    userName: "조은길",
    userId: "stu01",
    role: "student" as const,
    grade: "1학년",
    group: "1반",
  };

  test("matches name, id, and grade", () => {
    expect(memberMatchesQuery(member, "조은길")).toBe(true);
    expect(memberMatchesQuery(member, "stu01")).toBe(true);
    expect(memberMatchesQuery(member, "1학년")).toBe(true);
    expect(memberMatchesQuery(member, "학생")).toBe(true);
    expect(memberMatchesQuery(member, "없는값")).toBe(false);
  });

  test("empty query matches all", () => {
    expect(memberMatchesQuery(member, "  ")).toBe(true);
  });
});
