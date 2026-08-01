import {
  computeArchiveSummary,
  computeBoardSummary,
  computeCreatedSummary,
  computeEnrolledSummary,
  computeMentoringBaseSummary,
} from "./computeCourseSummaries";
import {
  applyGoalTargets,
  parseSummaryCurrent,
} from "pages/goals/goalItemCatalog";

describe("computeEnrolledSummary", () => {
  test("matches enrolled list basics", () => {
    const items = computeEnrolledSummary({
      courseList: [
        { _id: "1", point: "3", time: [{}, {}] },
        { _id: "2", point: "2", time: [{}] },
      ],
      formEvaluation: [],
      evaluationData: [],
      maxCredit: 10,
      minCredit: 1,
    });
    expect(items.find((i) => i.label === "수강 과목")?.value).toBe("2과목");
    expect(items.find((i) => i.label === "총 학점")?.value).toBe("5학점");
    expect(items.find((i) => i.label === "주간 수업 시수")?.value).toBe("3시수");
    expect(items.find((i) => i.label === "최대")?.value).toBe("10");
    expect(items.find((i) => i.label === "최소")?.value).toBe("1");
  });
});

describe("computeCreatedSummary / mentoring", () => {
  test("created counts", () => {
    const items = computeCreatedSummary([
      { point: 3, count: 2, limit: 10, teachers: [{ confirmed: true }] },
      {
        point: 1,
        count: 1,
        limit: 5,
        teachers: [{ confirmed: true }, { confirmed: false }],
      },
    ]);
    expect(items[0].value).toBe("2개");
    expect(items.find((i) => i.label === "승인 완료")?.value).toBe("1/2");
  });

  test("mentoring base label", () => {
    const items = computeMentoringBaseSummary([]);
    expect(items[0].label).toBe("담당 수업");
  });
});

describe("computeBoardSummary", () => {
  test("overall + per-form as n/n progress", () => {
    const items = computeBoardSummary({
      submitted: 2,
      total: 5,
      forms: [
        { formId: "f1", title: "과제A", submitted: 1, required: 2 },
        { formId: "f2", title: "과제B", submitted: 0, required: 1 },
      ],
    });
    expect(items[0]).toMatchObject({
      id: "board:전체 할 일",
      value: "2/5",
      current: 2,
      total: 5,
    });
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "board:form:f1",
          value: "1/2",
          current: 1,
          total: 2,
        }),
        expect.objectContaining({
          id: "board:form:f2",
          value: "0/1",
          current: 0,
          total: 1,
        }),
      ])
    );
  });
});

describe("applyGoalTargets", () => {
  test("parses current and applies school target as fill bar", () => {
    expect(parseSummaryCurrent({ value: "2학점" })).toBe(2);
    const items = applyGoalTargets(
      {
        items: {
          "enrolled:총 학점": { enabled: true, target: 66 },
        },
      },
      [{ id: "enrolled:총 학점", label: "총 학점", value: "2학점" }]
    );
    expect(items[0]).toMatchObject({
      current: 2,
      total: 66,
      value: "2/66",
    });
  });

  test("keeps existing ratio items", () => {
    const items = applyGoalTargets(
      { items: { "created:승인 완료": { enabled: true, target: 99 } } },
      [
        {
          id: "created:승인 완료",
          label: "승인 완료",
          value: "8/8",
          current: 8,
          total: 8,
        },
      ]
    );
    expect(items[0].total).toBe(8);
  });
});

describe("ratio fields", () => {
  test("created 승인 완료 has current/total", () => {
    const items = computeCreatedSummary([
      { point: 1, count: 0, limit: 0, teachers: [{ confirmed: true }] },
      { point: 1, count: 0, limit: 0, teachers: [{ confirmed: false }] },
    ]);
    const ok = items.find((i) => i.label === "승인 완료");
    expect(ok?.current).toBe(1);
    expect(ok?.total).toBe(2);
  });

  test("archive object uses 0/1 bar", () => {
    const items = computeArchiveSummary([
      { label: "인적", count: 0, dataType: "object" },
      { label: "봉사", count: 3, dataType: "array" },
    ]);
    expect(items[0]).toMatchObject({ current: 0, total: 1, value: "미입력" });
    expect(items[1]).toMatchObject({ value: "3건" });
    expect(items[1].total).toBeUndefined();
  });
});
