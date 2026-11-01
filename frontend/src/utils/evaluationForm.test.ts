import {
  buildMentorEvaluationColumns,
  isCourseMentor,
  resolveFormEvaluation,
} from "./evaluationForm";

describe("resolveFormEvaluation", () => {
  test("빈 등록 양식은 학기 양식으로 넘어간다", () => {
    const season = [{ label: "멘토평가", type: "input" as const, authOption: "editByTeacher" as const }];
    expect(resolveFormEvaluation([], season)).toEqual(season);
    expect(resolveFormEvaluation(undefined, season)).toEqual(season);
  });

  test("등록 양식이 있으면 그 스냅샷을 쓴다", () => {
    const registration = [{ label: "점수", type: "input-number" as const, authOption: "editByTeacher" as const }];
    const season = [{ label: "멘토평가", type: "input" as const, authOption: "editByTeacher" as const }];
    expect(resolveFormEvaluation(registration, season)).toEqual(registration);
  });
});

describe("isCourseMentor", () => {
  test("관리자는 담당 교사가 없어도 평가를 연다", () => {
    expect(
      isCourseMentor({ auth: "admin", _id: "admin", userId: "admin" }, { teachers: [] }, "school")
    ).toBe(true);
    expect(
      isCourseMentor({ auth: "admin", _id: "admin", userId: "admin" }, { teachers: undefined }, "school")
    ).toBe(true);
  });

  test("담당 교사 목록의 _id로도 멘토가 된다", () => {
    expect(
      isCourseMentor(
        { auth: "member", _id: "t1", userId: "teacher", schools: [] },
        { teachers: [{ _id: "t1", userId: "other-login" }] },
        "school"
      )
    ).toBe(true);
  });

  test("학생은 담당이 아니면 멘토가 아니다", () => {
    expect(
      isCourseMentor(
        { auth: "member", _id: "s1", userId: "student", schools: [] },
        { school: "school", teachers: [{ _id: "t1", userId: "teacher" }] },
        "school"
      )
    ).toBe(false);
  });
});

describe("buildMentorEvaluationColumns", () => {
  test("auth가 없어도 authOption 교사 입력 칸을 만든다", () => {
    const columns = buildMentorEvaluationColumns(
      [{ label: "멘토평가", type: "input", authOption: "editByTeacher" }],
      true
    );
    expect(columns).toEqual([
      {
        text: "멘토평가",
        key: "evaluation.멘토평가",
        type: "input",
        inputMinHeight: "72px",
      },
    ]);
  });

  test("학생 조회 칸은 읽기 전용으로 남긴다", () => {
    const columns = buildMentorEvaluationColumns(
      [
        {
          label: "자기평가",
          type: "input",
          authOption: "editByStudent",
          auth: {
            edit: { teacher: false, student: true },
            view: { teacher: true, student: true },
          },
        },
      ],
      true
    );
    expect(columns[0].type).toBe("text");
    expect(columns[0].key).toBe("evaluation.자기평가");
  });

  test("편집 권한이 없으면 라벨을 읽기 전용으로 모두 보여 준다", () => {
    const columns = buildMentorEvaluationColumns(
      [{ label: "멘토평가", authOption: "editByTeacher" }],
      false
    );
    expect(columns).toHaveLength(1);
    expect(columns[0].type).toBe("text");
  });
});
