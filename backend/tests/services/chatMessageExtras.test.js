import {
  isSingleEmoji,
  serializeReactions,
  MAX_REACTION_TYPES,
  toggleMessageReaction,
} from "../../src/services/chatMessageExtras.js";

describe("chatMessageExtras", () => {
  test("isSingleEmoji accepts common reactions and ZWJ sequences", () => {
    expect(isSingleEmoji("✅")).toBe(true);
    expect(isSingleEmoji("🙏")).toBe(true);
    expect(isSingleEmoji("👍")).toBe(true);
    expect(isSingleEmoji("❤️")).toBe(true);
    expect(isSingleEmoji("😂")).toBe(true);
    expect(isSingleEmoji("👨‍👩‍👧‍👦")).toBe(true);
  });

  test("isSingleEmoji rejects empty, text, html, and multiple graphemes", () => {
    expect(isSingleEmoji("")).toBe(false);
    expect(isSingleEmoji("abc")).toBe(false);
    expect(isSingleEmoji("<img>")).toBe(false);
    expect(isSingleEmoji("👍😂")).toBe(false);
    expect(isSingleEmoji(null)).toBe(false);
  });

  test("serializeReactions merges duplicate emoji groups", () => {
    const merged = serializeReactions([
      {
        emoji: "👍",
        users: [{ user: { toString: () => "u1" }, userId: "a", userName: "A" }],
      },
      {
        emoji: "👍",
        users: [
          { user: "u1", userId: "a", userName: "A" },
          { user: "u2", userId: "b", userName: "B" },
        ],
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].users).toHaveLength(2);
  });

  test("toggleMessageReaction rejects deleted and invalid emoji", async () => {
    const ChatMessage = () => ({
      updateOne: jest.fn(),
      findById: jest.fn(),
    });
    const deleted = await toggleMessageReaction({
      ChatMessage,
      academyId: "ac",
      message: { isDeleted: true, messageType: "text" },
      user: { _id: "u1", userId: "id", userName: "나" },
      emoji: "👍",
    });
    expect(deleted.error?.status).toBe(403);

    const invalid = await toggleMessageReaction({
      ChatMessage,
      academyId: "ac",
      message: { isDeleted: false, messageType: "text", reactions: [] },
      user: { _id: "u1", userId: "id", userName: "나" },
      emoji: "nope",
    });
    expect(invalid.error?.status).toBe(400);
  });

  test("toggleMessageReaction adds then removes a reaction", async () => {
    const updateOne = jest.fn().mockResolvedValue({});
    const findById = jest.fn().mockResolvedValue({
      reactions: [
        {
          emoji: "👍",
          users: [{ user: "u1", userId: "id", userName: "나" }],
        },
      ],
    });
    const ChatMessage = () => ({ updateOne, findById });
    const message = {
      _id: "m1",
      isDeleted: false,
      messageType: "text",
      reactions: [],
    };
    const user = { _id: "u1", userId: "id", userName: "나" };

    const added = await toggleMessageReaction({
      ChatMessage,
      academyId: "ac",
      message,
      user,
      emoji: "👍",
    });
    expect(added.error).toBeUndefined();
    expect(added.reactions[0].emoji).toBe("👍");
    expect(updateOne).toHaveBeenCalled();

    findById.mockResolvedValue({ reactions: [] });
    const removed = await toggleMessageReaction({
      ChatMessage,
      academyId: "ac",
      message: {
        ...message,
        reactions: [
          {
            emoji: "👍",
            users: [{ user: { toString: () => "u1" }, userId: "id", userName: "나" }],
          },
        ],
      },
      user,
      emoji: "👍",
    });
    expect(removed.reactions).toEqual([]);
  });

  test("toggleMessageReaction blocks more than MAX_REACTION_TYPES", async () => {
    const reactions = Array.from({ length: MAX_REACTION_TYPES }, (_, i) => ({
      emoji: String.fromCodePoint(0x1f600 + i),
      users: [{ user: "x", userId: "x", userName: "x" }],
    }));
    const result = await toggleMessageReaction({
      ChatMessage: () => ({ updateOne: jest.fn(), findById: jest.fn() }),
      academyId: "ac",
      message: { isDeleted: false, messageType: "text", reactions },
      user: { _id: "u1", userId: "id", userName: "나" },
      emoji: "✅",
    });
    expect(result.error?.status).toBe(400);
  });
});
