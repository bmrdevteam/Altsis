import {
  assembleCourseTodos,
  resolveEvalStatus,
  sortCourseTodos,
} from "../../src/utils/courseTodosAssemble.js";

describe("resolveEvalStatus", () => {
  test("maps 없음 / 완료 / 대기 / 평가중", () => {
    expect(
      resolveEvalStatus({ studentCount: 0, incomplete: true, periodOpen: true })
    ).toBe("없음");
    expect(
      resolveEvalStatus({
        studentCount: 2,
        incomplete: false,
        periodOpen: false,
      })
    ).toBe("완료");
    expect(
      resolveEvalStatus({
        studentCount: 2,
        incomplete: true,
        periodOpen: false,
      })
    ).toBe("대기");
    expect(
      resolveEvalStatus({ studentCount: 2, incomplete: true, periodOpen: true })
    ).toBe("평가중");
  });
});

describe("sortCourseTodos", () => {
  test("orders approve, confirmPending, evaluation; title within kind", () => {
    const sorted = sortCourseTodos([
      { kind: "evaluation", syllabusTitle: "나" },
      { kind: "approve", syllabusTitle: "가" },
      { kind: "confirmPending", syllabusTitle: "다" },
      { kind: "approve", syllabusTitle: "나" },
      { kind: "evaluation", syllabusTitle: "가" },
    ]);
    expect(sorted.map((t) => `${t.kind}:${t.syllabusTitle}`)).toEqual([
      "approve:가",
      "approve:나",
      "confirmPending:다",
      "evaluation:가",
      "evaluation:나",
    ]);
  });
});

describe("assembleCourseTodos", () => {
  const userId = "user1";

  const formEvaluation = [
    {
      label: "멘토평가",
      auth: { edit: { teacher: true, student: false } },
    },
    {
      label: "자기평가",
      auth: { edit: { teacher: false, student: true } },
    },
  ];

  const baseRegistration = {
    permissionSyllabusV2: true,
    permissionEnrollmentV2: true,
    permissionEvaluationV2: true,
    formEvaluation,
  };

  const season = { minCredit: 4, formEvaluation };

  test("returns empty when registration missing", () => {
    expect(
      assembleCourseTodos({
        registration: null,
        season,
        userId,
        mentoringSyllabi: [{ _id: "s1", teachers: [{ _id: userId }] }],
      })
    ).toEqual({ items: [], count: 0 });
  });

  test("builds approve for unconfirmed mentoring teacher", () => {
    const { items } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 0 },
      userId,
      mentoringSyllabi: [
        {
          _id: "s1",
          classTitle: "수학",
          teachers: [
            { _id: userId, confirmed: false },
            { _id: "other", confirmed: true },
          ],
        },
        {
          _id: "s2",
          classTitle: "과학",
          teachers: [{ _id: userId, confirmed: true }],
        },
      ],
    });
    expect(items.filter((i) => i.kind === "approve")).toEqual([
      {
        kind: "approve",
        surface: "mentoring",
        syllabusId: "s1",
        syllabusTitle: "수학",
      },
    ]);
  });

  test("builds confirmPending for created syllabi not fully confirmed", () => {
    const { items } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 0 },
      userId,
      createdSyllabi: [
        {
          _id: "c1",
          classTitle: "개설A",
          teachers: [
            { _id: userId, confirmed: true },
            { _id: "t2", confirmed: false },
          ],
        },
        {
          _id: "c2",
          classTitle: "개설B",
          teachers: [{ _id: userId, confirmed: true }],
        },
      ],
    });
    expect(items.filter((i) => i.kind === "confirmPending")).toEqual([
      {
        kind: "confirmPending",
        surface: "created",
        syllabusId: "c1",
        syllabusTitle: "개설A",
      },
    ]);
  });

  test("mentoring incomplete in period → 평가중", () => {
    const { items, count } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 0 },
      userId,
      mentoringSyllabi: [
        {
          _id: "s1",
          classTitle: "수학",
          teachers: [{ _id: userId, confirmed: true }],
        },
      ],
      enrollments: [
        {
          syllabus: "s1",
          student: "stu1",
          evaluation: { 멘토평가: "", 자기평가: "ok" },
        },
        {
          syllabus: "s1",
          student: "stu2",
          evaluation: { 멘토평가: "done", 자기평가: "" },
        },
      ],
    });
    const evalItems = items.filter(
      (i) => i.kind === "evaluation" && i.surface === "mentoring"
    );
    expect(evalItems).toHaveLength(1);
    expect(evalItems[0].evalStatus).toBe("평가중");
    expect(evalItems[0].missingEvalLabels).toEqual(["멘토평가"]);
    expect(count).toBe(1);
  });

  test("mentoring incomplete outside period → 대기 (not in sidebar count)", () => {
    const { items, count } = assembleCourseTodos({
      registration: {
        ...baseRegistration,
        permissionEvaluationV2: false,
      },
      season: { minCredit: 0 },
      userId,
      mentoringSyllabi: [
        {
          _id: "s1",
          classTitle: "수학",
          teachers: [{ _id: userId, confirmed: true }],
        },
      ],
      enrollments: [
        {
          syllabus: "s1",
          student: "stu1",
          evaluation: { 멘토평가: "" },
        },
      ],
    });
    expect(items.find((i) => i.kind === "evaluation")?.evalStatus).toBe("대기");
    expect(count).toBe(0);
  });

  test("mentoring complete → 완료", () => {
    const { items, count } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 0 },
      userId,
      mentoringSyllabi: [
        {
          _id: "s1",
          classTitle: "수학",
          teachers: [{ _id: userId, confirmed: true }],
        },
      ],
      enrollments: [
        {
          syllabus: "s1",
          student: "stu1",
          evaluation: { 멘토평가: "done" },
        },
      ],
    });
    expect(items.find((i) => i.kind === "evaluation")?.evalStatus).toBe("완료");
    expect(count).toBe(0);
  });

  test("mentoring with no students → 없음", () => {
    const { items, count } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 0 },
      userId,
      mentoringSyllabi: [
        {
          _id: "s1",
          classTitle: "빈수업",
          teachers: [{ _id: userId, confirmed: true }],
        },
      ],
      enrollments: [],
    });
    expect(items.find((i) => i.kind === "evaluation")?.evalStatus).toBe("없음");
    expect(count).toBe(0);
  });

  test("enrolled incomplete in period → 평가중", () => {
    const { items } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 0 },
      userId,
      enrolledSyllabi: [{ _id: "s1", classTitle: "수학", point: 2 }],
      enrollments: [
        {
          syllabus: "s1",
          student: userId,
          point: 2,
          evaluation: { 멘토평가: "t", 자기평가: "  " },
        },
      ],
    });
    const evalItems = items.filter(
      (i) => i.kind === "evaluation" && i.surface === "enrolled"
    );
    expect(evalItems).toHaveLength(1);
    expect(evalItems[0].evalStatus).toBe("평가중");
    expect(evalItems[0].missingEvalLabels).toEqual(["자기평가"]);
  });

  test("does not emit minCredit todos", () => {
    const { items } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 4 },
      userId,
      enrolledSyllabi: [
        { _id: "s1", classTitle: "A", point: 1 },
        { _id: "s2", classTitle: "B", point: 1 },
      ],
      enrollments: [
        { syllabus: "s1", student: userId, point: 1, evaluation: {} },
        { syllabus: "s2", student: userId, point: 1, evaluation: {} },
      ],
    });
    expect(items.filter((i) => i.kind === "minCredit")).toHaveLength(0);
  });

  test("sidebar count includes evaluation incomplete and approval (deduped)", () => {
    const { count } = assembleCourseTodos({
      registration: baseRegistration,
      season: { minCredit: 0 },
      userId,
      mentoringSyllabi: [
        {
          _id: "s1",
          classTitle: "수학",
          teachers: [{ _id: userId, confirmed: false }],
        },
        {
          _id: "s2",
          classTitle: "과학",
          teachers: [{ _id: userId, confirmed: true }],
        },
        {
          _id: "s3",
          classTitle: "빈수업",
          teachers: [{ _id: userId, confirmed: true }],
        },
        {
          _id: "s4",
          classTitle: "미승인만",
          teachers: [{ _id: userId, confirmed: false }],
        },
      ],
      enrollments: [
        { syllabus: "s1", student: "a", evaluation: { 멘토평가: "" } },
        { syllabus: "s2", student: "b", evaluation: { 멘토평가: "ok" } },
        // s4: no enrollments → 없음 + approve
      ],
    });
    // s1: 평가중(+approve) → 1
    // s2: 완료 → 0
    // s3: 없음 → 0
    // s4: 없음 + approve → 1
    expect(count).toBe(2);
  });

  test("confirmPending created course counts toward sidebar", () => {
    const { count } = assembleCourseTodos({
      registration: {
        ...baseRegistration,
        permissionEvaluationV2: false,
        formEvaluation: [],
      },
      season: { minCredit: 0, formEvaluation: [] },
      userId,
      createdSyllabi: [
        {
          _id: "c1",
          classTitle: "개설A",
          teachers: [
            { _id: userId, confirmed: true },
            { _id: "t2", confirmed: false },
          ],
        },
      ],
    });
    expect(count).toBe(1);
  });

  test("permission gates suppress approve; waiting eval not in sidebar", () => {
    const { items, count } = assembleCourseTodos({
      registration: {
        permissionSyllabusV2: false,
        permissionEnrollmentV2: false,
        permissionEvaluationV2: false,
        formEvaluation,
      },
      season: { minCredit: 10 },
      userId,
      mentoringSyllabi: [
        {
          _id: "s1",
          classTitle: "수학",
          teachers: [{ _id: userId, confirmed: false }],
        },
      ],
      createdSyllabi: [
        {
          _id: "c1",
          classTitle: "개설",
          teachers: [{ _id: "t2", confirmed: false }],
        },
      ],
      enrolledSyllabi: [{ _id: "s1", point: 0 }],
      enrollments: [
        {
          syllabus: "s1",
          student: userId,
          point: 0,
          evaluation: {},
        },
      ],
    });
    expect(items.every((i) => i.kind === "evaluation")).toBe(true);
    expect(items.every((i) => i.evalStatus === "대기")).toBe(true);
    expect(count).toBe(0);
  });
});
