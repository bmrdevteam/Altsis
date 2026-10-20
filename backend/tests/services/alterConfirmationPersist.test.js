const message = {
  conversation: "507f1f77bcf86cd799439011",
  content: "이미지를 만들까요?",
  confirmation: { id: "card-1", stage: "before_execute", status: "pending" },
  draft: null,
  markModified: jest.fn(),
  save: jest.fn(async () => message),
  toObject() {
    return {
      content: this.content,
      confirmation: this.confirmation,
      draft: this.draft,
    };
  },
};

const mockFindMessage = jest.fn();
const mockFindConversation = jest.fn();

jest.mock("../../src/models/AlterMessage.js", () => ({
  AlterMessage: () => ({
    findOne: (...args) => mockFindMessage(...args),
  }),
}));

jest.mock("../../src/models/AlterConversation.js", () => ({
  AlterConversation: () => ({
    findOne: (...args) => mockFindConversation(...args),
    updateMany: jest.fn(),
  }),
}));

jest.mock("../../src/models/index.js", () => ({
  Season: () => ({}),
}));

jest.mock("../../src/_s3/fileBucket.js", () => ({
  signUrlForView: () => "",
}));

import { syncAlterConfirmationMessage } from "../../src/services/alterConversations.js";

describe("confirmation message restore", () => {
  beforeEach(() => {
    message.content = "이미지를 만들까요?";
    message.confirmation = { id: "card-1", stage: "before_execute", status: "pending" };
    message.draft = null;
    message.attachments = [];
    message.markModified.mockClear();
    message.save.mockClear();
    mockFindMessage.mockReset();
    mockFindConversation.mockReset();
    mockFindMessage.mockResolvedValue(message);
    mockFindConversation.mockResolvedValue({ _id: message.conversation, user: "user1" });
  });

  test("cancel keeps the card cancelled", async () => {
    const result = await syncAlterConfirmationMessage({
      academyId: "academy1",
      userId: "user1",
      confirmationId: "card-1",
      status: "cancelled",
    });
    expect(mockFindMessage).toHaveBeenCalledWith(
      expect.objectContaining({ "confirmation.id": "card-1" })
    );
    expect(message.save).toHaveBeenCalled();
    expect(message.confirmation.status).toBe("cancelled");
    expect(result.confirmation.status).toBe("cancelled");
  });

  test("proceed stores the answer and the next card", async () => {
    await syncAlterConfirmationMessage({
      academyId: "academy1",
      userId: "user1",
      confirmationId: "card-1",
      content: "서울은 맑습니다.",
      draft: null,
      confirmation: { id: "card-2", stage: "before_apply", status: "pending" },
      attachments: [{ kind: "image", name: "그림", key: "academy1/alter/a.png", mimeType: "image/png" }],
    });
    expect(message.save).toHaveBeenCalled();
    expect(message.content).toBe("서울은 맑습니다.");
    expect(message.confirmation.id).toBe("card-2");
    expect(message.attachments[0].key).toBe("academy1/alter/a.png");
  });

  test("another user's card is not rewritten", async () => {
    mockFindConversation.mockResolvedValue(null);
    await expect(
      syncAlterConfirmationMessage({
        academyId: "academy1",
        userId: "user1",
        confirmationId: "card-1",
        status: "cancelled",
      })
    ).rejects.toThrow();
    expect(message.save).not.toHaveBeenCalled();
  });
});