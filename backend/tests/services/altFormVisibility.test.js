import {
  filterSheetRowDataForViewer,
  getVisibleRowFields,
} from "../../src/services/altForms.js";

const form = {
  fields: [
    { _id: "answer", type: "text", permission: "respondent" },
    { _id: "private", type: "text", permission: "owner" },
    {
      _id: "shared-owner",
      type: "text",
      permission: "owner",
      visibleToRespondent: true,
    },
    { _id: "approval", type: "approval", permission: "owner" },
    { _id: "circulation", type: "circulation", permission: "owner" },
  ],
  settings: {
    quizMode: true,
    assessmentMode: true,
    quizSettings: {
      scoreReveal: "never",
      answerReveal: "never",
    },
  },
};

describe("sheet row viewer filtering", () => {
  test("respondent fields include visible owner and workflow fields only", () => {
    expect(
      getVisibleRowFields(form, "respondent", false).map((field) =>
        String(field._id)
      )
    ).toEqual([
      "answer",
      "shared-owner",
      "approval",
      "circulation",
    ]);
  });

  test("removes owner-only, quiz answers, and draft assessment details", () => {
    const filtered = filterSheetRowDataForViewer(
      form,
      {
        answer: "응답",
        private: "교사 전용",
        "shared-owner": "공개 피드백",
        approval: { status: "pending" },
        circulation: [{ userId: "kim" }],
        _quiz_score: 2,
        _quiz_total: 3,
        _quiz_fieldResults: { answer: true },
        _assessment: {
          byField: { answer: { score: 2, comment: "비공개" } },
          final: { status: "draft", comment: "비공개" },
        },
      },
      { role: "respondent", canSeeFull: false }
    );

    expect(filtered).toEqual({
      answer: "응답",
      "shared-owner": "공개 피드백",
      approval: { status: "pending" },
      circulation: [{ userId: "kim" }],
      _assessment: { final: { status: "draft" } },
    });
  });

  test("full-row viewers keep all stored values", () => {
    const data = new Map([
      ["answer", "응답"],
      ["private", "교사 전용"],
      ["_quiz_score", 2],
    ]);
    expect(
      filterSheetRowDataForViewer(form, data, { canSeeFull: true })
    ).toEqual({
      answer: "응답",
      private: "교사 전용",
      _quiz_score: 2,
    });
  });
});
