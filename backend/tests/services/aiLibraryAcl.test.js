/**
 * AI 라이브러리 ACL 헬퍼
 */
import {
  canCreateLibraryItem,
  canReadLibraryItem,
  canWriteLibraryItem,
  isSchoolOfficialVisibility,
  resolveCreateKind,
  resolveCreateVisibility,
  schoolOfficialMatch,
  teacherExtraLearningQuery,
  visibleListFilter,
} from "../../src/services/aiLibraryAcl.js";

describe("aiLibraryAcl", () => {
  const schoolItem = { visibility: "school", owner: "u1" };
  const legacyItem = { owner: "u1" };
  const sharedItem = { visibility: "shared", owner: "u1" };
  const personalItem = { visibility: "personal", owner: "u1" };

  test("레거시·school은 학교 공식이다", () => {
    expect(isSchoolOfficialVisibility(undefined)).toBe(true);
    expect(isSchoolOfficialVisibility("school")).toBe(true);
    expect(isSchoolOfficialVisibility("shared")).toBe(false);
  });

  test("교사는 지침·학교 공식을 만들 수 없다", () => {
    expect(
      canCreateLibraryItem({
        isStaff: false,
        kind: "instruction",
        visibility: "personal",
      })
    ).toBe(false);
    expect(
      canCreateLibraryItem({
        isStaff: false,
        kind: "learning",
        visibility: "school",
      })
    ).toBe(false);
    expect(
      canCreateLibraryItem({
        isStaff: false,
        kind: "learning",
        visibility: "shared",
      })
    ).toBe(true);
  });

  test("관리자는 지침을 학교 공식으로 만든다", () => {
    expect(
      canCreateLibraryItem({
        isStaff: true,
        kind: "instruction",
        visibility: "school",
      })
    ).toBe(true);
    expect(resolveCreateKind("instruction")).toBe("instruction");
    expect(resolveCreateVisibility({ isStaff: true })).toBe("school");
    expect(resolveCreateVisibility({ isStaff: false })).toBe("personal");
  });

  test("읽기: 공식·공유는 모두, personal은 본인만", () => {
    expect(canReadLibraryItem(schoolItem, "u2")).toBe(true);
    expect(canReadLibraryItem(legacyItem, "u2")).toBe(true);
    expect(canReadLibraryItem(sharedItem, "u2")).toBe(true);
    expect(canReadLibraryItem(personalItem, "u2")).toBe(false);
    expect(canReadLibraryItem(personalItem, "u1")).toBe(true);
  });

  test("쓰기: 공식은 관리자, 공유는 작성자·관리자, 개인은 작성자", () => {
    expect(
      canWriteLibraryItem(schoolItem, { userId: "u1", isStaff: false })
    ).toBe(false);
    expect(canWriteLibraryItem(schoolItem, { userId: "u2", isStaff: true })).toBe(
      true
    );
    expect(
      canWriteLibraryItem(sharedItem, { userId: "u1", isStaff: false })
    ).toBe(true);
    expect(
      canWriteLibraryItem(sharedItem, { userId: "u2", isStaff: true })
    ).toBe(true);
    expect(
      canWriteLibraryItem(personalItem, { userId: "u2", isStaff: true })
    ).toBe(false);
    expect(
      canWriteLibraryItem(personalItem, { userId: "u1", isStaff: false })
    ).toBe(true);
  });

  test("목록 필터는 타인 personal을 제외한다", () => {
    const filter = visibleListFilter("school1", "u1");
    expect(filter.school).toBe("school1");
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { visibility: "shared" },
        { visibility: "personal", owner: "u1" },
        { visibility: "school" },
      ])
    );
    expect(filter.$or).not.toEqual(
      expect.arrayContaining([{ visibility: "personal" }])
    );
  });

  test("교사 추가 학습정보 쿼리는 shared+본인 personal이다", () => {
    expect(teacherExtraLearningQuery("s1", "u1")).toEqual({
      school: "s1",
      kind: "learning",
      $or: [
        { visibility: "shared" },
        { visibility: "personal", owner: "u1" },
      ],
    });
  });

  test("schoolOfficialMatch는 레거시 문서를 포함한다", () => {
    expect(schoolOfficialMatch.$or).toEqual(
      expect.arrayContaining([
        { visibility: "school" },
        { visibility: { $exists: false } },
      ])
    );
  });
});
