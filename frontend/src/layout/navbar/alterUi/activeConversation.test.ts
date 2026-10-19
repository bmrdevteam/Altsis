import {
  chooseConversationToRestore,
  readActiveConversation,
  writeActiveConversation,
} from "./activeConversation";

describe("active alter conversation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("remembers the open conversation for the same user and school", () => {
    writeActiveConversation("user-1", "school-1", "conv-9");
    expect(readActiveConversation("user-1", "school-1")?.conversationId).toBe("conv-9");
    expect(readActiveConversation("user-2", "school-1")).toBeNull();
  });

  test("an explicit new chat is not replaced by the server id", () => {
    writeActiveConversation("user-1", "school-1", null);
    const stored = readActiveConversation("user-1", "school-1");
    expect(chooseConversationToRestore(stored, "server-conv")).toBeNull();
  });

  test("without a local row, the server id is restored", () => {
    expect(chooseConversationToRestore(null, "server-conv")).toBe("server-conv");
    expect(chooseConversationToRestore(null, "")).toBeNull();
  });

  test("broken storage is ignored", () => {
    localStorage.setItem("altsis.alterActiveConversation", "{");
    expect(readActiveConversation("user-1", "school-1")).toBeNull();
  });
});
