import {
  canQuoteOrReact,
  countUnreadForMessage,
  formatQuotePrefix,
  formatQuotePreview,
  formatQuoteTime,
  splitQuoteContent,
  toggleReactionLocal,
  applyParticipantReadAt,
  applyMessageReactions,
} from "./chatMessageExtras";
import { TChatMessage, TChatParticipant } from "types/chat";

describe("chatMessageExtras", () => {
  test("formatQuotePreview truncates and labels media", () => {
    expect(
      formatQuotePreview({ messageType: "image", content: "x" })
    ).toBe("[이미지]");
    expect(
      formatQuotePreview({
        messageType: "file",
        content: "x",
        attachment: { fileName: "a.pdf" },
      })
    ).toBe("[파일] a.pdf");
    const long = "가".repeat(100);
    const preview = formatQuotePreview({ messageType: "text", content: long });
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBe(81);
  });

  test("formatQuotePrefix wraps sender and preview", () => {
    expect(
      formatQuotePrefix("홍길동", { messageType: "text", content: "안녕" })
    ).toBe("> 홍길동 : 안녕\n\n");
  });

  test("formatQuotePrefix includes time when createdAt is valid", () => {
    const prefix = formatQuotePrefix(
      "홍길동",
      { messageType: "text", content: "안녕" },
      "2026-08-19T05:35:00.000Z"
    );
    expect(prefix.startsWith("> 홍길동[")).toBe(true);
    expect(prefix.endsWith("] : 안녕\n\n")).toBe(true);
    expect(formatQuoteTime("2026-08-19T05:35:00.000Z").length).toBeGreaterThan(0);
    expect(formatQuoteTime("not-a-date")).toBe("");
  });

  test("splitQuoteContent separates leading quote lines", () => {
    expect(splitQuoteContent("그냥 메시지")).toEqual({
      quote: null,
      body: "그냥 메시지",
    });
    expect(splitQuoteContent("> 홍길동: 안녕\n\n확인했습니다")).toEqual({
      quote: "홍길동: 안녕",
      body: "확인했습니다",
    });
    expect(splitQuoteContent("")).toEqual({ quote: null, body: "" });
  });

  test("canQuoteOrReact rejects deleted and system", () => {
    expect(canQuoteOrReact({ isDeleted: true, messageType: "text" })).toBe(
      false
    );
    expect(canQuoteOrReact({ isDeleted: false, messageType: "system" })).toBe(
      false
    );
    expect(canQuoteOrReact({ isDeleted: false, messageType: "text" })).toBe(
      true
    );
  });

  test("toggleReactionLocal adds and removes the actor", () => {
    const actor = { user: "u1", userId: "id1", userName: "나" };
    const added = toggleReactionLocal(undefined, "👍", actor);
    expect(added).toEqual([
      { emoji: "👍", users: [actor] },
    ]);
    const removed = toggleReactionLocal(added, "👍", actor);
    expect(removed).toEqual([]);
    const other = toggleReactionLocal(added, "👍", {
      user: "u2",
      userId: "id2",
      userName: "너",
    });
    expect(other[0].users).toHaveLength(2);
  });

  test("countUnreadForMessage skips sender and counts missing lastReadAt", () => {
    const participants: TChatParticipant[] = [
      { user: "sender", userId: "s", userName: "나", joinedAt: "" },
      { user: "a", userId: "a", userName: "A", joinedAt: "" },
      {
        user: "b",
        userId: "b",
        userName: "B",
        joinedAt: "",
        lastReadAt: "2026-01-01T00:00:00.000Z",
      },
      {
        user: "c",
        userId: "c",
        userName: "C",
        joinedAt: "",
        lastReadAt: "2026-08-01T00:00:00.000Z",
      },
    ];
    const count = countUnreadForMessage(
      { sender: "sender", createdAt: "2026-06-01T00:00:00.000Z" },
      participants
    );
    expect(count).toBe(2);
    expect(
      countUnreadForMessage(
        { sender: "sender", createdAt: "2026-06-01T00:00:00.000Z" },
        [
          {
            user: "a",
            userId: "a",
            userName: "A",
            joinedAt: "",
            lastReadAt: "2026-08-01T00:00:00.000Z",
          },
        ]
      )
    ).toBe(0);
  });

  test("applyParticipantReadAt and applyMessageReactions patch lists", () => {
    const participants: TChatParticipant[] = [
      { user: "a", userId: "id-a", userName: "A", joinedAt: "" },
    ];
    expect(
      applyParticipantReadAt(participants, "id-a", "2026-08-01T00:00:00.000Z")[0]
        .lastReadAt
    ).toBe("2026-08-01T00:00:00.000Z");

    const messages = [
      { _id: "m1", reactions: [] },
      { _id: "m2", reactions: [] },
    ] as unknown as TChatMessage[];
    const next = applyMessageReactions(messages, "m1", [
      { emoji: "✅", users: [{ user: "a", userId: "a", userName: "A" }] },
    ]);
    expect(next[0].reactions?.[0].emoji).toBe("✅");
    expect(next[1].reactions).toEqual([]);
  });
});
