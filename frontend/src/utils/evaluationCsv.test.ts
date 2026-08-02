import {
  applyEvaluationCsvToEnrollments,
  buildEvaluationCsv,
  isEmptyEval,
  parseEvaluationCsv,
  parseCsvLine,
} from "./evaluationCsv";

describe("evaluationCsv", () => {
  test("parseCsvLine handles quoted commas", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
    expect(parseCsvLine('"he said ""hi"""')).toEqual(['he said "hi"']);
  });

  test("isEmptyEval", () => {
    expect(isEmptyEval("")).toBe(true);
    expect(isEmptyEval("  ")).toBe(true);
    expect(isEmptyEval(null)).toBe(true);
    expect(isEmptyEval("ok")).toBe(false);
  });

  test("parseEvaluationCsv matches ID and editable labels", () => {
    const csv = [
      "학년,이름,ID,자기평가,멘토평가",
      "11학년,김아찬,1140,성찰입니다,",
      '11학년,임하율,1153,"참고,값",기존',
    ].join("\n");
    const { rows, evalHeaders } = parseEvaluationCsv(
      csv,
      new Set(["자기평가", "멘토평가"])
    );
    expect(evalHeaders).toEqual(["자기평가", "멘토평가"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      studentId: "1140",
      studentName: "김아찬",
      evaluation: { 자기평가: "성찰입니다", 멘토평가: "" },
    });
    expect(rows[1].evaluation.자기평가).toBe("참고,값");
  });

  test("buildEvaluationCsv roundtrips labels", () => {
    const csv = buildEvaluationCsv(
      [
        {
          studentGrade: "11학년",
          studentName: "김아찬",
          studentId: "1140",
          evaluation: { 멘토평가: "좋아요" },
        },
      ],
      ["멘토평가"]
    );
    expect(csv.split("\r\n")[0]).toBe("학년,이름,ID,멘토평가");
    const { rows } = parseEvaluationCsv(csv, new Set(["멘토평가"]));
    expect(rows[0].evaluation.멘토평가).toBe("좋아요");
  });

  test("applyEvaluationCsvToEnrollments fills empty only", () => {
    const enrollments = [
      {
        _id: "e1",
        studentId: "1140",
        evaluation: { 멘토평가: "", 자기평가: "있음" },
        isModified: false,
      },
      {
        _id: "e2",
        studentId: "1153",
        evaluation: { 멘토평가: "기존", 자기평가: "" },
        isModified: false,
      },
    ];
    const csv = buildEvaluationCsv(
      [
        {
          studentId: "1140",
          evaluation: { 멘토평가: "초안A" },
        },
        {
          studentId: "1153",
          evaluation: { 멘토평가: "초안B" },
        },
        {
          studentId: "9999",
          evaluation: { 멘토평가: "무시" },
        },
      ],
      ["멘토평가"]
    );

    const result = applyEvaluationCsvToEnrollments(enrollments, csv, {
      fillEmptyOnly: true,
      editableLabels: ["멘토평가"],
    });

    expect(result.applied).toBe(1);
    expect(result.unknownIds).toEqual(["9999"]);
    expect(result.enrollments[0].evaluation.멘토평가).toBe("초안A");
    expect(result.enrollments[0]["evaluation.멘토평가"]).toBe("초안A");
    expect(result.enrollments[0].isModified).toBe(true);
    expect(result.enrollments[1].evaluation.멘토평가).toBe("기존");
    expect(result.enrollments[1].isModified).toBe(false);
  });
});
