jest.mock("../../src/models/index.js", () => ({
  AiLibraryItem: () => ({ find: jest.fn(() => ({ lean: jest.fn() })) }),
  Season: () => ({}),
  School: () => ({}),
  Registration: () => ({}),
  Syllabus: () => ({}),
  AltForm: () => ({}),
  AltSheetRow: () => ({}),
  Board: () => ({}),
}));

jest.mock("../../src/models/Academy.js", () => ({
  Academy: { findOne: jest.fn() },
}));

jest.mock("../../src/services/aiProvider.js", () => ({
  generateText: jest.fn(),
  generateTextStream: jest.fn(),
  resolveProvider: jest.fn(),
  resolveModel: jest.fn(),
}));

jest.mock("../../src/services/aiSafety.js", () => ({
  maskSensitiveText: (t) => ({ text: t }),
}));

jest.mock("../../src/services/aiUsage.js", () => ({
  logAIUsage: jest.fn(),
}));

jest.mock("../../src/services/altForms.js", () => ({
  canManageForm: jest.fn(() => true),
}));

import {
  normalizeAssessmentGradeDraft,
  parseAssessmentGradeResponse,
} from "../../src/services/aiSkills.js";

describe("parseAssessmentGradeResponse", () => {
  test("parses JSON markers", () => {
    const parsed = parseAssessmentGradeResponse(`<<<JSON>>>
{"byField":{"f1":{"score":2}},"final":{"comment":"ok"}}
<<<END>>>`);
    expect(parsed.byField.f1.score).toBe(2);
    expect(parsed.final.comment).toBe("ok");
  });
});

describe("normalizeAssessmentGradeDraft", () => {
  const form = {
    fields: [
      {
        _id: "f1",
        gradingMethod: "rubric",
        rubricIds: ["r1"],
      },
      {
        _id: "f2",
        gradingMethod: "manual_score",
        points: 5,
      },
    ],
    rubrics: [
      {
        id: "r1",
        levels: [
          { id: "lv1", label: "우수" },
          { id: "lv2", label: "보통" },
        ],
      },
    ],
  };

  test("clamps score and validates level ids", () => {
    const draft = normalizeAssessmentGradeDraft(form, {
      byField: {
        f1: { byRubric: { r1: { levelId: "lv1" } } },
        f2: { score: 100 },
      },
      final: { comment: "총평" },
    });
    expect(draft.byField.f1.byRubric.r1.levelId).toBe("lv1");
    expect(draft.byField.f2.score).toBe(5);
    expect(draft.final.comment).toBe("총평");
  });

  test("drops invalid level ids", () => {
    const draft = normalizeAssessmentGradeDraft(form, {
      byField: {
        f1: { byRubric: { r1: { levelId: "nope" } } },
      },
    });
    expect(draft.byField.f1.byRubric.r1.levelId).toBeUndefined();
  });
});
