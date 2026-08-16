import { formatAiChatCell, isAiChatRequiredMet, parseAiChatSummary } from "./formAiChat";
import { canAuthorFormAiChat, resolveAiRolePermission } from "./formAiPermission";

describe("formAiChat", () => {
  test("parse and required", () => {
    expect(parseAiChatSummary(null)).toBe(null);
    expect(
      isAiChatRequiredMet({
        sessionId: "s1",
        studentMessageCount: 1,
        messageCount: 2,
      })
    ).toBe(true);
    expect(
      isAiChatRequiredMet({
        sessionId: "s1",
        studentMessageCount: 0,
        messageCount: 0,
      })
    ).toBe(false);
  });

  test("formatAiChatCell", () => {
    expect(formatAiChatCell(null)).toBe("");
    expect(
      formatAiChatCell({
        sessionId: "s1",
        studentMessageCount: 3,
        messageCount: 6,
        lastMessagePreview: "좋아요",
      })
    ).toBe("대화 3턴 · 좋아요");
  });
});

describe("formAiPermission", () => {
  test("canAuthorFormAiChat requires teacher permission and AI on", () => {
    const school = {
      aiEnabled: true,
      academyFeatures: { aiEnabled: true },
      aiConfig: {
        permission: { teacher: true, student: false },
        skills: { chat: { libraryItemIds: [] } },
      },
    };
    const season = { aiSettings: { enabled: true, permission: { teacher: false, student: false } } };
    expect(canAuthorFormAiChat(school, season)).toBe(true);
    expect(
      canAuthorFormAiChat(
        { ...school, aiConfig: { ...school.aiConfig, permission: { teacher: false, student: false } } },
        season
      )
    ).toBe(false);
    expect(
      canAuthorFormAiChat(school, { aiSettings: { enabled: false, permission: { teacher: true, student: false } } })
    ).toBe(false);
  });

  test("resolveAiRolePermission uses season when school has no skills", () => {
    expect(
      resolveAiRolePermission(
        { aiConfig: { permission: { teacher: false, student: false } } },
        { aiSettings: { permission: { teacher: true, student: false } } },
        "teacher"
      )
    ).toBe(true);
  });
});
