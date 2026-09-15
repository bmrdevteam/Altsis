import {
  formatAiChatCell,
  isAiChatRequiredMet,
  isAssessmentGradeChatPayload,
  parseAiChatSummary,
} from "./formAiChat";
import {
  canAuthorFormAiChat,
  canShowAlter,
  resolveAiRolePermission,
} from "./formAiPermission";

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

  test("isAssessmentGradeChatPayload", () => {
    expect(isAssessmentGradeChatPayload(null)).toBe(false);
    expect(isAssessmentGradeChatPayload({ kind: "assessment-grade" })).toBe(
      false
    );
    expect(
      isAssessmentGradeChatPayload({
        kind: "assessment-grade",
        byField: { t1: { byRubric: { r1: { levelId: "l1" } } } },
      })
    ).toBe(true);
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

  test("resolveAiRolePermission uses school teacher Y even without skills", () => {
    expect(
      resolveAiRolePermission(
        { aiConfig: { permission: { teacher: true, student: false } } },
        { aiSettings: { permission: { teacher: false, student: false } } },
        "teacher"
      )
    ).toBe(true);
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

  test("canShowAlter uses school teacher Y and season enabled", () => {
    const school = {
      aiEnabled: true,
      academyFeatures: { aiEnabled: true },
      aiConfig: { permission: { teacher: true, student: false } },
    };
    const season = {
      aiSettings: { enabled: true, permission: { teacher: false, student: false } },
    };
    expect(canShowAlter(school, season, { role: "teacher" })).toBe(true);
    expect(canShowAlter(school, season, { role: "student" })).toBe(false);
    expect(
      canShowAlter(
        { ...school, aiConfig: { permission: { teacher: true, student: true } } },
        season,
        { role: "student" }
      )
    ).toBe(false);
    expect(
      canShowAlter(school, season, { role: "student", auth: "admin" })
    ).toBe(true);
    expect(
      canShowAlter(school, { aiSettings: { enabled: false } }, { role: "teacher" })
    ).toBe(false);
  });

  test("canShowAlter uses teacher exceptions", () => {
    const season = { aiSettings: { enabled: true } };
    const school = {
      aiEnabled: true,
      academyFeatures: { aiEnabled: true },
      aiConfig: {
        permission: {
          teacher: false,
          student: false,
          exceptions: [
            { user: "u1", userId: "tid", userName: "김교사", isAllowed: true },
            { user: "u2", userId: "deny", userName: "이교사", isAllowed: false },
          ],
        },
      },
    };
    expect(
      canShowAlter(school, season, { role: "teacher", userId: "u1" })
    ).toBe(true);
    expect(
      canShowAlter(
        {
          ...school,
          aiConfig: {
            permission: {
              teacher: true,
              student: false,
              exceptions: school.aiConfig.permission.exceptions,
            },
          },
        },
        season,
        { role: "teacher", userId: "u2" }
      )
    ).toBe(false);
  });
});
