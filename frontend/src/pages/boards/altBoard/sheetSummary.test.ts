import { TAltForm, TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { buildSheetSummary } from "./sheetSummary";

const field = (
  partial: Partial<TAltFormField> & { _id: string; type: TAltFormField["type"] }
): TAltFormField =>
  ({
    label: partial.label || partial._id,
    permission: "respondent",
    required: false,
    options: [],
    ...partial,
  }) as TAltFormField;

const row = (
  id: string,
  data: Record<string, unknown>
): TAltSheetRow =>
  ({
    _id: id,
    form: "form1",
    data,
  }) as TAltSheetRow;

const form = (partial: Partial<TAltForm> = {}): TAltForm =>
  ({
    _id: "form1",
    title: "설문",
    fields: [],
    rubrics: [],
    settings: {},
    ...partial,
  }) as TAltForm;

describe("buildSheetSummary", () => {
  test("aggregates option bars and text lists from filtered rows", () => {
    const radio = field({
      _id: "f_radio",
      type: "radio",
      label: "만족도",
      options: ["좋음", "보통", "나쁨"],
    });
    const text = field({
      _id: "f_text",
      type: "text",
      label: "의견",
    });
    const rows = [
      row("r1", { f_radio: "좋음", f_text: "좋아요" }),
      row("r2", { f_radio: "좋음", f_text: "" }),
      row("r3", { f_radio: "보통", f_text: "보통이에요" }),
    ];

    const result = buildSheetSummary({
      form: form(),
      rows,
      fields: [radio, text],
      includeAssessment: false,
    });

    expect(result.totalRows).toBe(3);
    expect(result.fields).toHaveLength(2);

    const radioSummary = result.fields.find((f) => f.fieldId === "f_radio");
    expect(radioSummary?.kind).toBe("bars");
    expect(radioSummary?.answerCount).toBe(3);
    expect(radioSummary?.bars?.find((b) => b.key === "좋음")?.count).toBe(2);
    expect(radioSummary?.bars?.find((b) => b.key === "보통")?.count).toBe(1);
    expect(radioSummary?.bars?.find((b) => b.key === "나쁨")?.count).toBe(0);

    const textSummary = result.fields.find((f) => f.fieldId === "f_text");
    expect(textSummary?.kind).toBe("list");
    expect(textSummary?.answerCount).toBe(2);
    expect(textSummary?.texts).toEqual(["좋아요", "보통이에요"]);
  });

  test("skips content/file fields and counts multiSelect tokens", () => {
    const content = field({ _id: "f_content", type: "content", label: "안내" });
    const file = field({ _id: "f_file", type: "file", label: "첨부" });
    const multi = field({
      _id: "f_multi",
      type: "multiSelect",
      label: "관심사",
      options: ["수학", "과학", "예술"],
    });
    const rows = [
      row("r1", { f_multi: ["수학", "과학"], f_file: ["a.pdf"] }),
      row("r2", { f_multi: ["수학"] }),
    ];

    const result = buildSheetSummary({
      form: form(),
      rows,
      fields: [content, file, multi],
      includeAssessment: false,
    });

    expect(result.fields.map((f) => f.fieldId)).toEqual(["f_multi"]);
    const multiSummary = result.fields[0];
    expect(multiSummary.answerCount).toBe(2);
    expect(multiSummary.bars?.find((b) => b.key === "수학")?.count).toBe(2);
    expect(multiSummary.bars?.find((b) => b.key === "과학")?.count).toBe(1);
  });

  test("includes quiz and finalized assessment only when includeAssessment", () => {
    const scoreField = field({
      _id: "f_score",
      type: "number",
      label: "점수",
      gradingMethod: "manual_score",
      points: 10,
    });
    const rows = [
      row("r1", {
        f_score: 8,
        _quiz_score: 7,
        _quiz_total: 10,
        _assessment: {
          byField: { f_score: { score: 8 } },
          final: { status: "finalized", score: 8, max: 10 },
        },
      }),
      row("r2", {
        f_score: 5,
        _quiz_score: 5,
        _quiz_total: 10,
        _assessment: {
          byField: { f_score: { score: 5 } },
          final: { status: "draft" },
        },
      }),
      row("r3", { f_score: 3 }),
    ];
    const f = form({
      fields: [scoreField],
      settings: { quizMode: true, assessmentMode: true } as TAltForm["settings"],
    });

    const without = buildSheetSummary({
      form: f,
      rows,
      fields: [scoreField],
      includeAssessment: false,
    });
    expect(without.quiz).toBeUndefined();
    expect(without.assessment).toBeUndefined();
    expect(without.fields[0].assessment).toBeUndefined();

    const withAssess = buildSheetSummary({
      form: f,
      rows,
      fields: [scoreField],
      includeAssessment: true,
    });
    expect(withAssess.quiz?.answered).toBe(2);
    expect(withAssess.quiz?.average).toBe(6);
    expect(withAssess.quiz?.max).toBe(10);
    expect(withAssess.assessment?.finalized).toBe(1);
    expect(withAssess.assessment?.draft).toBe(1);
    expect(withAssess.assessment?.ungraded).toBe(1);
    expect(withAssess.assessment?.averageScore).toBe(8);
    expect(withAssess.fields[0].assessment?.method).toBe("manual_score");
    expect(withAssess.fields[0].assessment?.scoreAverage).toBe(8);
  });

  test("aggregates rubric levels only from finalized assessments", () => {
    const essay = field({
      _id: "f_essay",
      type: "textarea",
      label: "감상문",
      gradingMethod: "rubric",
      rubricIds: ["r1"],
    });
    const f = form({
      fields: [essay],
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
      settings: { assessmentMode: true } as TAltForm["settings"],
    });
    const rows = [
      row("r1", {
        f_essay: "A",
        _assessment: {
          byField: {
            f_essay: {
              byRubric: { r1: { levelId: "lv1", levelLabel: "우수" } },
            },
          },
          final: { status: "finalized", score: 3, max: 3 },
        },
      }),
      row("r2", {
        f_essay: "B",
        _assessment: {
          byField: {
            f_essay: {
              byRubric: { r1: { levelId: "lv2", levelLabel: "보통" } },
            },
          },
          final: { status: "draft" },
        },
      }),
    ];

    const result = buildSheetSummary({
      form: f,
      rows,
      fields: [essay],
      includeAssessment: true,
    });
    const group = result.fields[0].assessment?.rubricGroups?.[0];
    expect(group?.rubricTitle).toBe("기준");
    expect(group?.bars.find((b) => b.key === "lv1")?.count).toBe(1);
    expect(group?.bars.find((b) => b.key === "lv2")?.count).toBe(0);
  });
});
