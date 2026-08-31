import { canAccessAlterLibrary } from "./libraryAccess";
import {
  ALL_SKILLS_TONE,
  FILE_BADGE_TONE,
  LIBRARY_SKILL_LABELS,
  canEditLibraryItem,
  canPromoteLibraryItem,
  filterLibraryItems,
  isSchoolOfficialItem,
  libraryFilterCounts,
  skillTone,
} from "./libraryFilters";
import { TAiLibraryItem } from "types/schools";

describe("canAccessAlterLibrary", () => {
  const school = {
    aiConfig: { permission: { teacher: true, student: false }, skills: {} },
  };
  const season = { aiSettings: { enabled: true } };

  test("관리자는 학기 AI와 무관하게 접근한다", () => {
    expect(
      canAccessAlterLibrary({
        auth: "admin",
        role: "student",
        school,
        season: { aiSettings: { enabled: false } },
      })
    ).toBe(true);
  });

  test("교사는 Alter가 켜져 있을 때만 접근한다", () => {
    expect(
      canAccessAlterLibrary({
        auth: "member",
        role: "teacher",
        school,
        season,
      })
    ).toBe(true);
    expect(
      canAccessAlterLibrary({
        auth: "member",
        role: "teacher",
        school,
        season: { aiSettings: { enabled: false } },
      })
    ).toBe(false);
  });

  test("학생은 접근하지 못한다", () => {
    expect(
      canAccessAlterLibrary({
        auth: "member",
        role: "student",
        school: {
          aiConfig: {
            permission: { teacher: true, student: true },
            skills: {},
          },
        },
        season,
      })
    ).toBe(false);
  });
});

describe("filterLibraryItems", () => {
  const items: TAiLibraryItem[] = [
    {
      _id: "1",
      school: "s",
      kind: "instruction",
      visibility: "school",
      title: "세특 지침",
      content: "",
    },
    {
      _id: "2",
      school: "s",
      kind: "learning",
      visibility: "personal",
      owner: "u1",
      ownerName: "김교사",
      title: "내 PDF",
      content: "",
    },
    {
      _id: "3",
      school: "s",
      kind: "learning",
      visibility: "shared",
      owner: "u2",
      title: "공유 자료",
      content: "",
    },
  ];

  test("유형·공개 범위·키워드로 좁힌다", () => {
    expect(filterLibraryItems(items, { filter: "instruction" })).toHaveLength(
      1
    );
    expect(filterLibraryItems(items, { filter: "personal" })[0]._id).toBe("2");
    expect(filterLibraryItems(items, { filter: "school" })[0]._id).toBe("1");
    expect(filterLibraryItems(items, { keyword: "김교사" })[0]._id).toBe("2");
  });

  test("카운트는 유형과 공개 범위를 나눈다", () => {
    expect(libraryFilterCounts(items)).toEqual({
      all: 3,
      instruction: 1,
      learning: 2,
      personal: 1,
      shared: 1,
      school: 1,
    });
  });
});

describe("library item permissions", () => {
  const schoolItem: TAiLibraryItem = {
    _id: "s",
    school: "sc",
    kind: "instruction",
    visibility: "school",
    title: "공식",
    content: "",
  };
  const shared: TAiLibraryItem = {
    _id: "sh",
    school: "sc",
    kind: "learning",
    visibility: "shared",
    owner: "u1",
    title: "공유",
    content: "",
  };

  test("학교 공식은 관리자만 수정한다", () => {
    expect(canEditLibraryItem(schoolItem, { userId: "u1", auth: "member" })).toBe(
      false
    );
    expect(canEditLibraryItem(schoolItem, { userId: "u1", auth: "admin" })).toBe(
      true
    );
  });

  test("공유는 작성자 또는 관리자가 수정하고 관리자만 승격한다", () => {
    expect(canEditLibraryItem(shared, { userId: "u1", auth: "member" })).toBe(
      true
    );
    expect(canEditLibraryItem(shared, { userId: "u2", auth: "member" })).toBe(
      false
    );
    expect(canPromoteLibraryItem(shared, "admin")).toBe(true);
    expect(canPromoteLibraryItem(shared, "member")).toBe(false);
    expect(canPromoteLibraryItem(schoolItem, "admin")).toBe(false);
  });

  test("visibility 없는 항목은 학교 공식이다", () => {
    expect(
      isSchoolOfficialItem({
        _id: "x",
        school: "s",
        kind: "learning",
        title: "옛",
        content: "",
      })
    ).toBe(true);
  });
});

describe("library badge tones", () => {
  test("스킬마다 다른 뱃지 톤을 둔다", () => {
    expect(LIBRARY_SKILL_LABELS.every((s) => !!s.tone)).toBe(true);
    expect(new Set(LIBRARY_SKILL_LABELS.map((s) => s.tone)).size).toBe(
      LIBRARY_SKILL_LABELS.length
    );
    expect(skillTone("document-draft")).toBe("Optional");
    expect(skillTone("unknown")).toBe("Optional");
    expect(FILE_BADGE_TONE).toBe("Closed");
    expect(ALL_SKILLS_TONE).toBe("All");
  });
});
