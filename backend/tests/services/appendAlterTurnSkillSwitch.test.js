/**
 * 한 대화에서 스킬을 바꿔도 ALTER_SKILL_LOCKED 없이 append 되는지 검증
 */
const mockSave = jest.fn(async function save() {
  return this;
});

const mockConversation = {
  _id: "507f1f77bcf86cd799439011",
  user: "507f1f77bcf86cd799439099",
  school: "507f1f77bcf86cd799439088",
  season: "507f1f77bcf86cd799439077",
  messageCount: 2,
  lastSkill: "chat",
  titleCustom: false,
  save: mockSave,
  toObject() {
    const { save, toObject, ...rest } = this;
    return { ...rest };
  },
};

const mockMessageCreate = jest.fn();

jest.mock("../../src/models/AlterConversation.js", () => ({
  AlterConversation: () => ({
    findOne: jest.fn(async () => mockConversation),
    create: jest.fn(),
  }),
}));

jest.mock("../../src/models/AlterMessage.js", () => ({
  AlterMessage: () => ({
    create: (...args) => mockMessageCreate(...args),
  }),
}));

jest.mock("../../src/models/index.js", () => ({
  Season: () => ({
    findById: () => ({
      select: () => ({
        lean: async () => ({
          _id: "507f1f77bcf86cd799439077",
          school: "507f1f77bcf86cd799439088",
          year: "2026",
          term: "1",
        }),
      }),
    }),
  }),
}));

jest.mock("../../src/_s3/fileBucket.js", () => ({
  signUrlForView: () => "",
}));

import { appendAlterTurn } from "../../src/services/alterConversations.js";

describe("appendAlterTurn multi-skill", () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockMessageCreate.mockReset();
    mockMessageCreate.mockImplementation(async (doc) => {
      const row = { ...doc, _id: "msg1", createdAt: new Date() };
      return { ...row, toObject: () => ({ ...row }) };
    });
    mockConversation.messageCount = 2;
    mockConversation.lastSkill = "chat";
  });

  test("chat 대화에 form-response-draft를 이어서 저장할 수 있다", async () => {
    const result = await appendAlterTurn({
      academyId: "academy1",
      userId: "507f1f77bcf86cd799439099",
      seasonId: "507f1f77bcf86cd799439077",
      conversationId: "507f1f77bcf86cd799439011",
      userMessage: "응답 초안을 작성해 주세요",
      assistantMessage: "초안을 만들었습니다.",
      skill: "form-response-draft",
      pageType: "form-response",
      contextLabel: "양식",
    });

    expect(result.conversation.lastSkill).toBe("form-response-draft");
    expect(mockConversation.lastSkill).toBe("form-response-draft");
    expect(mockSave).toHaveBeenCalled();
    expect(mockMessageCreate).toHaveBeenCalled();
  });
});
