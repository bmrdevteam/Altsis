import mongoose from "mongoose";

jest.mock("../../src/_s3/fileBucket.js", () => ({
  signUrlForView: () => "",
}));

jest.mock("../../src/models/AlterConversation.js", () => ({
  AlterConversation: () => ({}),
}));

jest.mock("../../src/models/AlterMessage.js", () => ({
  AlterMessage: () => ({}),
}));

jest.mock("../../src/models/index.js", () => ({
  Season: () => ({}),
}));

import { olderThanConversationCursor } from "../../src/services/alterConversations.js";

describe("olderThanConversationCursor", () => {
  test("returns null without a valid date", () => {
    expect(olderThanConversationCursor()).toBeNull();
    expect(olderThanConversationCursor("not-a-date")).toBeNull();
  });

  test("uses lastMessageAt and _id when both are valid", () => {
    const id = new mongoose.Types.ObjectId().toString();
    const at = "2026-08-01T00:00:00.000Z";
    const filter = olderThanConversationCursor(at, id);
    expect(filter.$or).toHaveLength(2);
    expect(filter.$or[0].lastMessageAt.$lt.toISOString()).toBe(at);
    expect(filter.$or[1]._id.$lt.toString()).toBe(id);
  });

  test("falls back to lastMessageAt only without id", () => {
    const at = "2026-08-01T00:00:00.000Z";
    const filter = olderThanConversationCursor(at);
    expect(filter.lastMessageAt.$lt.toISOString()).toBe(at);
    expect(filter.$or).toBeUndefined();
  });
});
