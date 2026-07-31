import {
  isRoomParticipant,
  canManageBoardChatRooms,
} from "../../src/utils/boardChatPermissions.js";

describe("board chat private room helpers", () => {
  test("isRoomParticipant matches participant user ids", () => {
    const room = {
      participants: [
        { user: { toString: () => "u1" } },
        { user: "u2" },
      ],
    };
    expect(isRoomParticipant(room, "u1")).toBe(true);
    expect(isRoomParticipant(room, "u2")).toBe(true);
    expect(isRoomParticipant(room, "u3")).toBe(false);
    expect(isRoomParticipant(null, "u1")).toBe(false);
  });

  test("respondents cannot manage team rooms", () => {
    const board = {
      creator: "c1",
      altBoardRole: { r1: "respondent", w1: "writer" },
    };
    expect(
      canManageBoardChatRooms(board, { _id: "r1", auth: "member" })
    ).toBe(false);
    expect(
      canManageBoardChatRooms(board, { _id: "w1", auth: "member" })
    ).toBe(true);
  });
});
