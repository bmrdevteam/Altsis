/**
 * aiLibraryChunks: 분할·검색 유틸
 */
const mockDeleteMany = jest.fn();
const mockInsertMany = jest.fn();
const mockCountDocuments = jest.fn();
const mockFindLean = jest.fn();
const mockChunkFind = jest.fn();
const mockItemFindById = jest.fn();

jest.mock("../../src/models/index.js", () => ({
  AiLibraryChunk: () => ({
    deleteMany: mockDeleteMany,
    insertMany: mockInsertMany,
    countDocuments: mockCountDocuments,
    find: mockChunkFind,
  }),
  AiLibraryItem: () => ({
    findById: mockItemFindById,
  }),
}));

jest.mock("../../src/log/logger.js", () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

import {
  buildSearchQuery,
  chunkText,
  rebuildChunksForItem,
  retrieveLibraryChunks,
} from "../../src/services/aiLibraryChunks.js";
import { PROMPT_LIMITS, truncateText } from "../../src/services/aiPromptPolicy.js";

describe("chunkText", () => {
  test("짧은 텍스트는 한 조각이다", () => {
    expect(chunkText("hello")).toEqual(["hello"]);
  });

  test("긴 텍스트는 overlap을 두고 나눈다", () => {
    const text = "가".repeat(2500);
    const chunks = chunkText(text, { maxChars: 1200, overlap: 150 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(1200);
    const joinedApprox = chunks.join("").length;
    expect(joinedApprox).toBeGreaterThan(2500);
  });

  test("빈 문자열은 빈 배열", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });
});

describe("rebuildChunksForItem", () => {
  beforeEach(() => {
    mockDeleteMany.mockReset();
    mockInsertMany.mockReset();
    mockDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mockInsertMany.mockResolvedValue([]);
  });

  test("본문을 청크로 저장한다", async () => {
    const item = {
      _id: "item1",
      school: "school1",
      kind: "learning",
      title: "교육계획서",
      content: "본문 ".repeat(800),
    };
    const { chunkCount } = await rebuildChunksForItem("academy1", item);
    expect(mockDeleteMany).toHaveBeenCalledWith({ libraryItem: "item1" });
    expect(chunkCount).toBeGreaterThan(0);
    expect(mockInsertMany).toHaveBeenCalled();
    const docs = mockInsertMany.mock.calls[0][0];
    expect(docs[0].title).toBe("교육계획서");
    expect(docs[0].index).toBe(0);
  });
});

describe("retrieveLibraryChunks", () => {
  beforeEach(() => {
    mockChunkFind.mockReset();
  });

  test("미선택 libraryItem은 검색 대상에 넣지 않는다", async () => {
    const lean = jest.fn().mockResolvedValue([]);
    const sort = jest.fn(() => ({ limit: () => ({ lean }) }));
    mockChunkFind.mockImplementation(() => ({ sort, lean }));

    await retrieveLibraryChunks({
      academyId: "academy1",
      schoolId: "school1",
      libraryItemIds: ["a", "b"],
      query: "학사일정 평가",
      limit: 6,
    });

    const filter = mockChunkFind.mock.calls[0][0];
    expect(filter.libraryItem.$in).toEqual(["a", "b"]);
    expect(filter.kind).toBe("learning");
  });

  test("regex fallback으로 관련 청크를 고른다", async () => {
    const rows = [
      {
        libraryItem: "doc1",
        title: "교육계획서",
        index: 2,
        text: "학사일정과 평가 원칙을 안내합니다.",
      },
      {
        libraryItem: "doc1",
        title: "교육계획서",
        index: 0,
        text: "서문입니다.",
      },
      {
        libraryItem: "doc2",
        title: "다른문서",
        index: 0,
        text: "학사일정 보충",
      },
    ];
    mockChunkFind
      .mockImplementationOnce(() => {
        throw new Error("no text index");
      })
      .mockImplementationOnce(() => ({
        sort: () => ({
          limit: () => ({
            lean: async () => rows,
          }),
        }),
      }));

    // force $text path to fail then regex
    const result = await retrieveLibraryChunks({
      academyId: "academy1",
      schoolId: "school1",
      libraryItemIds: ["doc1", "doc2"],
      query: "학사일정 평가",
      limit: 6,
      perDoc: 3,
    });

    // $text throws inside try — then regex path
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toMatch(/조각/);
    expect(result.every((r) => ["doc1", "doc2"].includes(r.libraryItemId))).toBe(
      true
    );
  });
});

describe("buildSearchQuery / LIBRARY_CONTENT_CHARS", () => {
  test("짧은 토큰을 걸러 검색어를 만든다", () => {
    expect(buildSearchQuery("학사일정과 평가 원칙")).toContain("학사일정과");
  });

  test("라이브러리 저장 상한은 프롬프트 한도보다 크다", () => {
    expect(PROMPT_LIMITS.LIBRARY_CONTENT_CHARS).toBeGreaterThanOrEqual(10000);
    const tenK = "가".repeat(10000);
    expect(truncateText(tenK, PROMPT_LIMITS.LIBRARY_CONTENT_CHARS).length).toBe(
      10000
    );
    expect(truncateText(tenK, PROMPT_LIMITS.REFERENCE_CHARS * 4).length).toBeLessThan(
      10000
    );
  });
});
