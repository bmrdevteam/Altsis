import {
  mergeAssessmentGradeDraft,
  normalizeAssessmentGradeDraft,
} from "./assessmentGradeDraft";
import { TAltForm } from "types/altForm";

const form = {
  _id: "form1",
  title: "평가",
  fields: [
    {
      _id: "f1",
      label: "감상문",
      type: "textarea",
      gradingMethod: "rubric",
      rubricIds: ["r1"],
    },
    {
      _id: "f2",
      label: "점수",
      type: "number",
      gradingMethod: "manual_score",
      points: 5,
    },
  ],
  rubrics: [
    {
      id: "r1",
      title: "기준",
      levels: [
        { id: "lv1", label: "우수", points: 3 },
        { id: "lv2", label: "보통", points: 2 },
      ],
    },
  ],
  settings: { assessmentMode: true },
} as unknown as TAltForm;

describe("normalizeAssessmentGradeDraft", () => {
  test("keeps valid rubric level and clamps score", () => {
    const draft = normalizeAssessmentGradeDraft(form, {
      byField: {
        f1: {
          byRubric: { r1: { levelId: "lv1", comment: "좋아요" } },
        },
        f2: { score: 99, comment: "만점" },
      },
      final: { comment: "총평" },
    });
    expect(draft.byField.f1?.byRubric?.r1?.levelId).toBe("lv1");
    expect(draft.byField.f2?.score).toBe(5);
    expect(draft.final.comment).toBe("총평");
  });

  test("drops unknown level ids", () => {
    const draft = normalizeAssessmentGradeDraft(form, {
      byField: {
        f1: { byRubric: { r1: { levelId: "unknown" } } },
      },
    });
    expect(draft.byField.f1?.byRubric?.r1?.levelId).toBeUndefined();
  });
});

describe("mergeAssessmentGradeDraft", () => {
  test("fillEmptyOnly skips filled fields", () => {
    const current = {
      byField: {
        f1: { byRubric: { r1: { levelId: "lv2" } } },
      },
      final: { comment: "기존" },
    };
    const incoming = {
      byField: {
        f1: { byRubric: { r1: { levelId: "lv1" } } },
        f2: { score: 3 },
      },
      final: { comment: "새 총평" },
    };
    const merged = mergeAssessmentGradeDraft(current, incoming, {
      fillEmptyOnly: true,
    });
    expect(merged.byField.f1?.byRubric?.r1?.levelId).toBe("lv2");
    expect(merged.byField.f2?.score).toBe(3);
    expect(merged.final.comment).toBe("기존");
  });
});
