import { canManageBoardChatRooms } from "../../src/utils/boardChatPermissions.js";

describe("canManageBoardChatRooms", () => {
  const boardBase = {
    creator: "creator-oid",
    altBoardRole: {
      "admin-oid": "admin",
      "writer-oid": "writer",
      "respondent-oid": "respondent",
    },
  };

  it("allows system admin/manager", () => {
    expect(
      canManageBoardChatRooms(boardBase, {
        _id: "x",
        auth: "admin",
      })
    ).toBe(true);
    expect(
      canManageBoardChatRooms(boardBase, {
        _id: "x",
        auth: "manager",
      })
    ).toBe(true);
  });

  it("allows board creator", () => {
    expect(
      canManageBoardChatRooms(boardBase, {
        _id: "creator-oid",
        auth: "member",
      })
    ).toBe(true);
  });

  it("allows altBoardRole admin/writer only", () => {
    expect(
      canManageBoardChatRooms(boardBase, {
        _id: "admin-oid",
        auth: "member",
      })
    ).toBe(true);
    expect(
      canManageBoardChatRooms(boardBase, {
        _id: "writer-oid",
        auth: "member",
      })
    ).toBe(true);
    expect(
      canManageBoardChatRooms(boardBase, {
        _id: "respondent-oid",
        auth: "member",
      })
    ).toBe(false);
  });

  it("supports Map-shaped altBoardRole", () => {
    const board = {
      creator: "c",
      altBoardRole: new Map([["writer-oid", "writer"]]),
    };
    expect(
      canManageBoardChatRooms(board, { _id: "writer-oid", auth: "member" })
    ).toBe(true);
  });
});
