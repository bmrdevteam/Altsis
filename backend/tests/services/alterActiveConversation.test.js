const mockSave = jest.fn(async function save() {
  return this;
});
const owned = {
  _id: "507f1f77bcf86cd799439011",
  user: "user1",
  school: "school1",
  active: false,
  save: mockSave,
  toObject() {
    const { save, toObject, ...rest } = this;
    return { ...rest };
  },
};

const mockFindOne = jest.fn();
const mockUpdateMany = jest.fn(async () => ({ modifiedCount: 1 }));

jest.mock("../../src/models/AlterConversation.js", () => ({
  AlterConversation: () => ({
    findOne: (...args) => mockFindOne(...args),
    updateMany: (...args) => mockUpdateMany(...args),
  }),
}));

jest.mock("../../src/models/AlterMessage.js", () => ({
  AlterMessage: () => ({}),
}));

jest.mock("../../src/models/index.js", () => ({
  Season: () => ({}),
}));

jest.mock("../../src/_s3/fileBucket.js", () => ({
  signUrlForView: () => "",
}));

import {
  getActiveAlterConversation,
  setActiveAlterConversation,
} from "../../src/services/alterConversations.js";

describe("active alter conversation", () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockUpdateMany.mockClear();
    mockFindOne.mockReset();
    owned.active = false;
  });

  test("returns the conversation marked active for this school", async () => {
    mockFindOne.mockReturnValue({
      lean: async () => ({ _id: owned._id, active: true }),
    });
    const found = await getActiveAlterConversation({
      academyId: "academy1",
      userId: "user1",
      schoolId: "school1",
    });
    expect(found._id).toBe(owned._id);
    expect(mockFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ user: "user1", school: "school1", active: true, isDeleted: false })
    );
  });

  test("marks one conversation and clears the previous active row", async () => {
    mockFindOne.mockResolvedValue(owned);
    const result = await setActiveAlterConversation({
      academyId: "academy1",
      userId: "user1",
      schoolId: "school1",
      conversationId: owned._id,
    });
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ user: "user1", school: "school1", active: true }),
      { $set: { active: false } }
    );
    expect(owned.active).toBe(true);
    expect(result.conversation._id).toBe(owned._id);
    expect(mockSave).toHaveBeenCalled();
  });

  test("an empty id clears the active conversation", async () => {
    const result = await setActiveAlterConversation({
      academyId: "academy1",
      userId: "user1",
      schoolId: "school1",
      conversationId: null,
    });
    expect(result.conversation).toBeNull();
    expect(mockUpdateMany).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
