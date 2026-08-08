/**
 * bulkDeleteAlterConversations
 */
const mockLean = jest.fn();
const mockUpdateMany = jest.fn();
const mockFind = jest.fn(() => ({
  select: () => ({ lean: mockLean }),
}));

jest.mock("../../src/models/AlterConversation.js", () => ({
  AlterConversation: () => ({
    find: mockFind,
    updateMany: mockUpdateMany,
  }),
}));

jest.mock("../../src/models/AlterMessage.js", () => ({
  AlterMessage: () => ({}),
}));

jest.mock("../../src/models/index.js", () => ({
  Season: () => ({
    find: () => ({ select: () => ({ lean: async () => [] }) }),
  }),
}));

jest.mock("../../src/_s3/fileBucket.js", () => ({
  signUrlForView: () => "",
}));

import { bulkDeleteAlterConversations } from "../../src/services/alterConversations.js";

describe("bulkDeleteAlterConversations", () => {
  beforeEach(() => {
    mockFind.mockClear();
    mockUpdateMany.mockClear();
    mockLean.mockReset();
    mockFind.mockImplementation(() => ({
      select: () => ({ lean: mockLean }),
    }));
    mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });
  });

  test("소유 대화만 삭제하고 working·잘못된 id는 건너뛴다", async () => {
    const idleId = "507f1f77bcf86cd799439011";
    const workingId = "507f1f77bcf86cd799439012";
    const missingId = "507f1f77bcf86cd799439013";
    mockLean.mockResolvedValue([
      { _id: idleId, status: "idle" },
      { _id: workingId, status: "working" },
    ]);

    const result = await bulkDeleteAlterConversations({
      academyId: "academy1",
      userId: "user1",
      conversationIds: [idleId, workingId, missingId, "not-an-id"],
    });

    expect(result.deleted).toEqual([idleId]);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { id: workingId, reason: "working" },
        { id: missingId, reason: "not_found" },
        { id: "not-an-id", reason: "not_found" },
      ])
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $in: [idleId] },
        user: "user1",
      }),
      { $set: { isDeleted: true, status: "idle" } }
    );
  });

  test("ids가 비면 400", async () => {
    await expect(
      bulkDeleteAlterConversations({
        academyId: "academy1",
        userId: "user1",
        conversationIds: [],
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});
