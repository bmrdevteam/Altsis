/**
 * resolveSkillPromptPack 스모크
 */
const mockFindLean = jest.fn();
const mockFind = jest.fn(() => ({
  lean: mockFindLean,
  select: () => ({ lean: mockFindLean }),
}));

jest.mock("../../src/models/index.js", () => ({
  AiLibraryItem: () => ({ find: mockFind }),
  Season: () => ({}),
  School: () => ({}),
  Registration: () => ({}),
  Syllabus: () => ({}),
}));

jest.mock("../../src/models/Academy.js", () => ({
  Academy: { findOne: jest.fn() },
}));

jest.mock("../../src/services/aiProvider.js", () => ({
  generateText: jest.fn(),
  generateTextStream: jest.fn(),
  resolveProvider: jest.fn(),
  resolveModel: jest.fn(),
}));

jest.mock("../../src/services/aiSafety.js", () => ({
  maskSensitiveText: (t) => ({ text: t }),
}));

jest.mock("../../src/services/aiUsage.js", () => ({
  logAIUsage: jest.fn(),
}));

import {
  resolveSkillPromptPack,
  resolveSkillPrepSettings,
  SKILL_IDS,
} from "../../src/services/aiSkills.js";

describe("resolveSkillPromptPack", () => {
  beforeEach(() => {
    mockFindLean.mockReset();
    mockFind.mockReset();
    mockFind.mockImplementation(() => ({
      lean: mockFindLean,
      select: () => ({ lean: mockFindLean }),
    }));
  });

  test("학교 skills 가 있으면 라이브러리 지침·학습정보를 사용한다", async () => {
    mockFindLean.mockResolvedValue([
      {
        _id: "lib1",
        kind: "learning",
        title: "학습정보 A",
        content: "내용 A",
      },
      {
        _id: "lib2",
        kind: "instruction",
        title: "세특 작성 지침",
        content: "세특은 성장 중심으로 작성",
      },
    ]);

    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          permission: { teacher: true, student: false },
          skills: {
            [SKILL_IDS.CHAT]: {
              instructions: "레거시 직접 지침(무시됨)",
              libraryItemIds: ["lib1", "lib2"],
            },
          },
        },
      },
      {
        aiSettings: {
          guidelines: "시즌 지침",
          references: [{ title: "시즌", content: "시즌 내용" }],
        },
      },
      SKILL_IDS.CHAT
    );

    expect(pack.fromSchool).toBe(true);
    expect(pack.guidelines).not.toContain("레거시 직접 지침");
    expect(pack.guidelines).toContain("세특 작성 지침");
    expect(pack.guidelines).toContain("성장 중심");
    expect(pack.guidelines).toContain("적용 라이브러리");
    expect(pack.guidelines).toContain("학습정보 A");
    expect(pack.references).toHaveLength(1);
    expect(pack.references[0].title).toBe("학습정보 A");
    expect(pack.learningLibraryItemIds).toEqual(["lib1"]);
    expect(mockFind).toHaveBeenCalled();
  });

  test("chat은 학습정보 5개 선택 시 참고 본문 한도(≤8)와 제목 목록 전체를 넣는다", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      _id: `lib${i + 1}`,
      kind: "learning",
      title: `문서 ${i + 1}`,
      content: `본문 ${i + 1} `.repeat(500),
    }));
    mockFindLean.mockResolvedValue(items);

    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          skills: {
            [SKILL_IDS.CHAT]: {
              libraryItemIds: items.map((it) => it._id),
            },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.CHAT
    );

    expect(pack.references.length).toBeLessThanOrEqual(8);
    expect(pack.references).toHaveLength(5);
    expect(pack.learningTitles).toHaveLength(5);
    for (const title of pack.learningTitles) {
      expect(pack.guidelines).toContain(title);
    }
    expect(pack.references[0].content.length).toBeLessThanOrEqual(4001);
    expect(pack.learningLibraryItemIds).toHaveLength(5);
  });

  test("다른 스킬은 참고 개수 2개 한도를 유지한다", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      _id: `lib${i + 1}`,
      kind: "learning",
      title: `문서 ${i + 1}`,
      content: "본문",
    }));
    mockFindLean.mockResolvedValue(items);

    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          skills: {
            [SKILL_IDS.EVALUATION_DRAFT]: {
              libraryItemIds: items.map((it) => it._id),
            },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.EVALUATION_DRAFT
    );

    expect(pack.references).toHaveLength(2);
  });

  test("라이브러리 지침이 없으면 레거시 skills.instructions 를 사용한다", async () => {
    mockFindLean.mockResolvedValue([
      {
        _id: "lib1",
        kind: "learning",
        title: "학습정보 A",
        content: "내용 A",
      },
    ]);

    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          permission: { teacher: true, student: false },
          skills: {
            [SKILL_IDS.CHAT]: {
              instructions: "레거시 직접 지침입니다",
              libraryItemIds: ["lib1"],
            },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.CHAT
    );

    expect(pack.fromSchool).toBe(true);
    expect(pack.guidelines).toContain("레거시 직접 지침");
    expect(pack.references).toHaveLength(1);
  });

  test("학교 skills 가 비어 있으면 시즌 fallback 을 사용한다", async () => {
    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          permission: { teacher: false, student: false },
          skills: {},
        },
      },
      {
        aiSettings: {
          guidelines: "시즌 전용 지침",
          references: [{ title: "시즌참고", content: "시즌 본문" }],
          exampleSyllabusIds: ["syl1"],
        },
      },
      SKILL_IDS.EVALUATION_DRAFT
    );

    expect(pack.fromSchool).toBe(false);
    expect(pack.guidelines).toContain("시즌 전용 지침");
    expect(pack.references[0].title).toBe("시즌참고");
    expect(pack.exampleSyllabusIds).toEqual(["syl1"]);
    expect(mockFind).not.toHaveBeenCalled();
  });

  test("강의계획서 초안 스킬은 참고자료·모범계획서를 넣지 않는다", async () => {
    mockFindLean.mockResolvedValue([
      {
        _id: "lib1",
        kind: "learning",
        title: "학습정보 A",
        content: "내용 A",
      },
      {
        _id: "lib2",
        kind: "instruction",
        title: "작성 지침",
        content: "구체적으로",
      },
    ]);

    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          skills: {
            [SKILL_IDS.SYLLABUS_DRAFT]: {
              libraryItemIds: ["lib1", "lib2"],
              exampleSyllabusIds: ["syl1"],
            },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.SYLLABUS_DRAFT
    );

    expect(pack.fromSchool).toBe(true);
    expect(pack.guidelines).toContain("작성 지침");
    expect(pack.references).toEqual([]);
    expect(pack.exampleSyllabusIds).toEqual([]);
  });

  test("평가 초안 스킬도 학교 지침을 읽는다", async () => {
    mockFindLean.mockResolvedValue([]);
    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          permission: { teacher: true, student: false },
          skills: {
            [SKILL_IDS.EVALUATION_DRAFT]: {
              instructions: "평가 문체는 존댓말로",
              libraryItemIds: [],
            },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.EVALUATION_DRAFT
    );

    expect(pack.fromSchool).toBe(true);
    expect(pack.guidelines).toContain("평가 문체는 존댓말로");
  });

  test("prep 설정은 기본 가이드 없이 라이브러리 지침만 보여 준다", async () => {
    mockFindLean.mockResolvedValue([
      {
        _id: "lib2",
        kind: "instruction",
        title: "세특 작성 지침",
        content: "성장 중심",
      },
      {
        _id: "lib1",
        kind: "learning",
        title: "학습정보 A",
        content: "내용 A",
      },
    ]);

    const prep = await resolveSkillPrepSettings(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          skills: {
            [SKILL_IDS.SYLLABUS_DRAFT]: {
              instructions: "",
              libraryItemIds: ["lib2", "lib1"],
            },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.SYLLABUS_DRAFT
    );

    expect(prep.fromSchool).toBe(true);
    expect(prep.guidelines).toContain("세특 작성 지침");
    expect(prep.guidelines).toContain("성장 중심");
    // 초안 스킬 prep 에는 참고자료(learning)를 노출하지 않음
    expect(prep.references).toEqual([]);
    expect(prep.instructionItems?.map((it) => it._id)).toEqual(
      expect.arrayContaining(["lib2"])
    );
    expect(prep.defaultGuidelineItemIds).toEqual(
      expect.arrayContaining(["lib2"])
    );
  });

  test("prep 설정은 지침이 없으면 빈 문자열을 반환한다", async () => {
    mockFindLean.mockResolvedValue([]);
    const prep = await resolveSkillPrepSettings(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          skills: {
            [SKILL_IDS.CHAT]: { libraryItemIds: [] },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.CHAT
    );

    expect(prep.guidelines).toBe("");
    expect(prep.references).toEqual([]);
  });

  test("chat 스킬은 라이브러리가 없으면 수업형 defaultSkillGuide를 넣지 않는다", async () => {
    mockFindLean.mockResolvedValue([]);
    const pack = await resolveSkillPromptPack(
      "academy1",
      {
        _id: "school1",
        aiConfig: {
          permission: { teacher: true, student: false },
          skills: {
            [SKILL_IDS.CHAT]: { libraryItemIds: [] },
          },
        },
      },
      { aiSettings: {} },
      SKILL_IDS.CHAT
    );

    expect(pack.fromSchool).toBe(true);
    expect(pack.guidelines).toBe("");
    expect(pack.guidelines).not.toMatch(/학습목표/);
    expect(pack.guidelines).not.toMatch(/평가 정합성/);
  });
});
