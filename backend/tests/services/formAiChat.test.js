import {
  annotateSessionsWithRowStatus,
  buildAiChatRowSummary,
  buildFormAiChatSystemPrompt,
  canReadFormAiChatSession,
  buildAssessmentGradeChatPayload,
  formatAssessmentGradeChatText,
  hasSchoolSkillConfig,
  isAiChatFieldType,
  isAiChatRequiredMet,
  isAiChatSendLocked,
  newAiChatFieldIds,
  parseAiChatSummary,
  resolveAiRolePermission,
  rowSummaryPointsToSession,
} from "../../src/services/formAiChat.js";

describe("formAiChat helpers", () => {
  test("isAiChatFieldType", () => {
    expect(isAiChatFieldType("aiChat")).toBe(true);
    expect(isAiChatFieldType("content")).toBe(false);
    expect(isAiChatFieldType("")).toBe(false);
  });

  test("hasSchoolSkillConfig requires skill keys", () => {
    expect(hasSchoolSkillConfig(null)).toBe(false);
    expect(hasSchoolSkillConfig({ aiConfig: { skills: {} } })).toBe(false);
    expect(
      hasSchoolSkillConfig({ aiConfig: { skills: { chat: { libraryItemIds: [] } } } })
    ).toBe(true);
  });

  test("resolveAiRolePermission prefers school when skills exist", () => {
    const school = {
      aiConfig: {
        permission: { teacher: true, student: false },
        skills: { chat: {} },
      },
    };
    const season = {
      aiSettings: { permission: { teacher: false, student: true } },
    };
    expect(resolveAiRolePermission(school, season, "teacher")).toBe(true);
    expect(resolveAiRolePermission(school, season, "student")).toBe(false);
  });

  test("resolveAiRolePermission prefers school teacher Y even without skills", () => {
    const school = {
      aiConfig: { permission: { teacher: true, student: false } },
    };
    const season = {
      aiSettings: { permission: { teacher: false, student: false } },
    };
    expect(resolveAiRolePermission(school, season, "teacher")).toBe(true);
  });

  test("resolveAiRolePermission uses teacher exceptions", () => {
    const school = {
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
    const season = { aiSettings: { permission: { teacher: false } } };
    expect(resolveAiRolePermission(school, season, "teacher", "u1")).toBe(true);
    expect(
      resolveAiRolePermission(
        {
          aiConfig: {
            permission: {
              teacher: true,
              student: false,
              exceptions: school.aiConfig.permission.exceptions,
            },
          },
        },
        season,
        "teacher",
        "u2"
      )
    ).toBe(false);
  });

  test("resolveAiRolePermission falls back to season", () => {
    const school = { aiConfig: { permission: { teacher: false, student: false } } };
    const season = {
      aiSettings: { permission: { teacher: true, student: false } },
    };
    expect(resolveAiRolePermission(school, season, "teacher")).toBe(true);
  });

  test("newAiChatFieldIds only returns newly added aiChat fields", () => {
    const prev = [{ _id: "a", type: "aiChat" }, { _id: "t", type: "text" }];
    const next = [
      { _id: "a", type: "aiChat" },
      { _id: "b", type: "aiChat" },
      { _id: "t", type: "text" },
    ];
    expect(newAiChatFieldIds(prev, next)).toEqual(["b"]);
    expect(newAiChatFieldIds([], next)).toEqual(["a", "b"]);
    expect(newAiChatFieldIds(prev, prev)).toEqual([]);
  });

  test("isAiChatSendLocked locks submitted rows unless resubmit", () => {
    expect(isAiChatSendLocked({ isDraft: true }, false)).toBe(false);
    expect(isAiChatSendLocked({ isDraft: false }, false)).toBe(true);
    expect(isAiChatSendLocked({ isDraft: false }, true)).toBe(false);
    expect(isAiChatSendLocked(null, false)).toBe(false);
  });

  test("isAiChatRequiredMet needs one student turn", () => {
    expect(isAiChatRequiredMet(0)).toBe(false);
    expect(isAiChatRequiredMet(1)).toBe(true);
    expect(isAiChatRequiredMet(undefined)).toBe(false);
  });

  test("build and parse row summary", () => {
    const summary = buildAiChatRowSummary({
      _id: "sess1",
      messageCount: 4,
      studentMessageCount: 2,
      lastMessagePreview: "안녕",
      lastMessageAt: "2026-08-16T00:00:00.000Z",
    });
    expect(summary.sessionId).toBe("sess1");
    expect(parseAiChatSummary(summary)?.studentMessageCount).toBe(2);
    expect(parseAiChatSummary(null)).toBe(null);
    expect(parseAiChatSummary("x")).toBe(null);
  });

  test("system prompt includes guidelines, safety, and materials", () => {
    const prompt = buildFormAiChatSystemPrompt({
      form: { title: "탐구 일지" },
      board: { name: "과학" },
      field: {
        label: "학습 대화",
        content: "힌트만 주고 답을 말하지 마세요.",
        attachments: [{ originalName: "자료.pdf" }],
        links: [{ title: "위키", url: "https://example.com" }],
      },
    });
    expect(prompt).toContain("탐구 일지");
    expect(prompt).toContain("학습 대화");
    expect(prompt).toContain("힌트만 주고");
    expect(prompt).toContain("자료.pdf");
    expect(prompt).toContain("https://example.com");
    expect(prompt).toContain("미성년");
    expect(prompt).toContain("열람");
  });

  test("formatAssessmentGradeChatText lists levels and comments, skips owner", () => {
    const form = {
      fields: [
        {
          _id: "t1",
          label: "탐구 내용",
          gradingMethod: "rubric",
          permission: "respondent",
        },
        {
          _id: "s1",
          label: "교사 메모",
          gradingMethod: "manual_score",
          permission: "owner",
        },
      ],
      rubrics: [
        {
          id: "r1",
          title: "탐구 루브릭",
          levels: [{ id: "l1", label: "우수", points: 3 }],
        },
      ],
    };
    const text = formatAssessmentGradeChatText(form, {
      byField: {
        t1: {
          comment: "근거가 분명합니다",
          byRubric: { r1: { levelId: "l1", comment: "" } },
        },
        s1: { score: 5, comment: "비밀" },
      },
      final: { comment: "잘했습니다" },
    });
    expect(text).toContain("탐구 내용");
    expect(text).toContain("탐구 루브릭: 우수 (3점)");
    expect(text).toContain("근거가 분명합니다");
    expect(text).toContain("잘했습니다");
    expect(text).not.toContain("교사 메모");
    expect(text).not.toContain("비밀");
  });

  test("formatAssessmentGradeChatText keeps field score and omits missing points", () => {
    const form = {
      fields: [
        {
          _id: "t1",
          label: "탐구 내용",
          gradingMethod: "rubric",
          permission: "respondent",
        },
      ],
      rubrics: [
        {
          id: "r1",
          title: "탐구 루브릭",
          levels: [{ id: "l1", label: "보통" }],
        },
      ],
    };
    const text = formatAssessmentGradeChatText(form, {
      byField: {
        t1: {
          score: 2,
          byRubric: { r1: { levelId: "l1" } },
        },
      },
    });
    expect(text).toContain("탐구 루브릭: 보통");
    expect(text).not.toContain("(");
    expect(text).toContain("점수: 2");
  });

  test("buildAssessmentGradeChatPayload keeps respondent byRubric and skips owner", () => {
    const form = {
      fields: [
        {
          _id: "t1",
          label: "탐구 내용",
          gradingMethod: "rubric",
          permission: "respondent",
        },
        {
          _id: "s1",
          label: "교사 메모",
          gradingMethod: "manual_score",
          permission: "owner",
        },
      ],
    };
    const payload = buildAssessmentGradeChatPayload(form, {
      byField: {
        t1: {
          comment: "근거가 분명합니다",
          byRubric: { r1: { levelId: "l1", comment: "수준 코멘트" } },
        },
        s1: { score: 5, comment: "비밀" },
      },
      final: { comment: "잘했습니다" },
    });
    expect(payload.kind).toBe("assessment-grade");
    expect(payload.byField.t1.byRubric.r1.levelId).toBe("l1");
    expect(payload.byField.t1.byRubric.r1.comment).toBe("수준 코멘트");
    expect(payload.byField.t1.comment).toBe("근거가 분명합니다");
    expect(payload.final.comment).toBe("잘했습니다");
    expect(payload.byField.s1).toBeUndefined();
  });

  test("annotateSessionsWithRowStatus marks missing or inactive rows", () => {
    const sessions = [
      { _id: "s1", row: "r1" },
      { _id: "s2", row: "r2" },
      { _id: "s3" },
    ];
    const marked = annotateSessionsWithRowStatus(sessions, ["r1"]);
    expect(marked[0].responseDeleted).toBe(false);
    expect(marked[1].responseDeleted).toBe(true);
    expect(marked[2].responseDeleted).toBe(true);
    expect(
      annotateSessionsWithRowStatus([{ _id: "s4", row: "r1" }], new Set(["r1"]))[0]
        .responseDeleted
    ).toBe(false);
  });

  test("rowSummaryPointsToSession matches stored summary", () => {
    expect(
      rowSummaryPointsToSession({ sessionId: "abc" }, "abc")
    ).toBe(true);
    expect(
      rowSummaryPointsToSession({ sessionId: "abc" }, "other")
    ).toBe(false);
    expect(rowSummaryPointsToSession(null, "abc")).toBe(false);
  });

  test("canReadFormAiChatSession allows teacher, owner, and shared members", () => {
    expect(
      canReadFormAiChatSession({
        canViewAll: true,
        isOwner: false,
        shareResponses: false,
        isMember: false,
      })
    ).toBe(true);
    expect(
      canReadFormAiChatSession({
        canViewAll: false,
        isOwner: true,
        shareResponses: false,
        isMember: true,
      })
    ).toBe(true);
    expect(
      canReadFormAiChatSession({
        canViewAll: false,
        isOwner: false,
        shareResponses: true,
        isMember: true,
      })
    ).toBe(true);
  });

  test("canReadFormAiChatSession denies non-shared peer and non-member", () => {
    expect(
      canReadFormAiChatSession({
        canViewAll: false,
        isOwner: false,
        shareResponses: false,
        isMember: true,
      })
    ).toBe(false);
    expect(
      canReadFormAiChatSession({
        canViewAll: false,
        isOwner: false,
        shareResponses: true,
        isMember: false,
      })
    ).toBe(false);
  });
});
