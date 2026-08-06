/**
 * chat: retrieval 결과가 참고 자료로 쓰이는지 (merge 계약)
 */
import { buildAlterChatSystemPrompt } from "../../src/services/alterCorePrompt.js";
import { retrieveLibraryChunks } from "../../src/services/aiLibraryChunks.js";

const mockChunkFind = jest.fn();

jest.mock("../../src/models/index.js", () => ({
  AiLibraryChunk: () => ({
    find: (...args) => mockChunkFind(...args),
    deleteMany: jest.fn(),
    insertMany: jest.fn(),
    countDocuments: jest.fn(),
  }),
  AiLibraryItem: () => ({
    findById: jest.fn(),
  }),
}));

jest.mock("../../src/log/logger.js", () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

describe("chat library retrieve → prompt merge", () => {
  beforeEach(() => {
    mockChunkFind.mockReset();
  });

  test("검색 청크 본문이 시스템 프롬프트 참고 자료에 들어간다", async () => {
    mockChunkFind.mockImplementation(() => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            {
              libraryItem: "edu-plan",
              title: "교육계획서",
              index: 4,
              text: "평가 원칙: 과정 중심 평가를 실시한다.",
            },
          ],
        }),
      }),
    }));

    // $text path: first call with projection
    const retrieved = await retrieveLibraryChunks({
      academyId: "academy1",
      schoolId: "school1",
      libraryItemIds: ["edu-plan"],
      query: "평가 원칙",
    });

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].content).toContain("과정 중심");

    const fallbackRefs = [
      { title: "교육계획서", content: "서문만…" },
    ];
    const references = retrieved.length > 0 ? retrieved : fallbackRefs;
    const system = buildAlterChatSystemPrompt({
      guidelines: "## 적용 라이브러리\n1. 교육계획서",
      references,
    });

    expect(system).toContain("참고 자료");
    expect(system).toContain("교육계획서 · 조각 5");
    expect(system).toContain("과정 중심 평가");
    expect(system).toContain("그 조각만 근거로 답하세요");
    expect(system).not.toContain("서문만…");
  });
});
