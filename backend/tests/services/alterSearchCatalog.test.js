import {
  archiveTableName,
  filterEvaluationForSearch,
  formAnswerColumns,
  formTableName,
  isPiiArchiveLabel,
  canReadArchiveItem,
  mapOneFormSearchRow,
  visibleEvalLabels,
  visibleFormSearchFields,
  buildEnrollmentQuery,
  formatRegistrationValueHint,
  expandArchiveRows,
} from "../../src/services/alterSearchCatalog.js";

const seasonIds = ["s1"];

describe("alterSearchCatalog helpers", () => {
  test("form table names slug and collide independently of archive", () => {
    expect(formTableName("2026학년도 3쿼터 컴퓨터 신청")).toBe(
      "form_2026학년도_3쿼터_컴퓨터_신청"
    );
    expect(formTableName("컴퓨터 신청!")).toBe("form_컴퓨터_신청");
  });

  test("formAnswerColumns maps field id to label and skips PII and content", () => {
    const cols = formAnswerColumns([
      {
        _id: "f1",
        label: "컴퓨터",
        type: "select",
        options: ["신청", "미신청"],
      },
      { _id: "f2", label: "연락처", type: "text" },
      { _id: "f3", label: "안내", type: "content" },
      { _id: "f4", label: "form_title", type: "text" },
      { _id: "f5", label: "컴퓨터", type: "text" },
      { _id: "f6", label: "첨부", type: "file" },
      { _id: "f7", label: "결재", type: "approval" },
    ]);
    expect(cols.map((c) => c.name)).toEqual(["컴퓨터", "컴퓨터_2"]);
    expect(cols[0].fieldId).toBe("f1");
    expect(cols[0].comment).toMatch(/신청, 미신청/);
  });

  test("mapOneFormSearchRow fills allowed columns without residual hidden data", () => {
    const cols = formAnswerColumns([
      { _id: "comp", label: "컴퓨터", type: "select", options: ["신청"] },
    ]);
    const row = mapOneFormSearchRow(
      { _id: "form1", title: "컴퓨터 신청" },
      {
        _id: "r1",
        _respondent: "u1",
        _respondentId: "kwon",
        _respondentName: "권시은",
        data: { comp: "신청", extra: "x" },
      },
      cols
    );
    expect(row.컴퓨터).toBe("신청");
    expect(row.form_title).toBe("컴퓨터 신청");
    expect(row.respondent_name).toBe("권시은");
    expect(row.answers_json).toBe("{}");
  });

  test("archive table names and PII labels", () => {
    expect(archiveTableName("행동특성")).toBe("archive_행동특성");
    expect(isPiiArchiveLabel("주민등록번호")).toBe(true);
    expect(isPiiArchiveLabel("주소")).toBe(true);
    expect(isPiiArchiveLabel("휴대폰")).toBe(true);
    expect(isPiiArchiveLabel("핸드폰")).toBe(true);
    expect(isPiiArchiveLabel("메일")).toBe(true);
    expect(isPiiArchiveLabel("phone")).toBe(true);
    expect(isPiiArchiveLabel("종합의견")).toBe(false);
  });

  test("respondent form search fields exclude private owner fields", () => {
    const form = {
      fields: [
        { _id: "answer", permission: "respondent", type: "text" },
        { _id: "private", permission: "owner", type: "text" },
        {
          _id: "shared",
          permission: "owner",
          visibleToRespondent: true,
          type: "text",
        },
      ],
    };
    expect(
      visibleFormSearchFields(
        form,
        { altBoardRole: new Map() },
        { _id: "student", auth: "member" },
        { role: "student" }
      ).map((field) => field._id)
    ).toEqual(["answer", "shared"]);
  });

  test("student enrollment query is self-only", () => {
    const student = { _id: "u-student", auth: "member" };
    const q = buildEnrollmentQuery({
      user: student,
      registration: { role: "student" },
      seasonIds,
      teacherSyllabusIds: ["other"],
    });
    expect(q.student).toBe("u-student");
    expect(q.syllabus).toBeUndefined();
  });

  test("teacher enrollment query is limited to their syllabi", () => {
    const teacher = { _id: "u-teacher", auth: "member" };
    const q = buildEnrollmentQuery({
      user: teacher,
      registration: { role: "teacher" },
      seasonIds,
      teacherSyllabusIds: ["sy1", "sy2"],
    });
    expect(q.syllabus).toEqual({ $in: ["sy1", "sy2"] });
    expect(q.student).toBeUndefined();
  });

  test("manager enrollment query is season-wide", () => {
    const q = buildEnrollmentQuery({
      user: { _id: "u-m", auth: "manager" },
      registration: { role: "teacher" },
      seasonIds,
      teacherSyllabusIds: ["sy1"],
    });
    expect(q.syllabus).toBeUndefined();
    expect(q.student).toBeUndefined();
  });

  test("grade and name filters are $and-ed onto permission query", () => {
    const q = buildEnrollmentQuery({
      user: { _id: "u-m", auth: "manager" },
      registration: { role: "teacher" },
      seasonIds,
      grade: "12학년",
      mongoFilter: { studentName: "권시은" },
    });
    expect(JSON.stringify(q)).toContain("s1");
    expect(JSON.stringify(q)).toContain("12학년");
    expect(JSON.stringify(q)).toContain("권시은");
    expect(q.student).toBeUndefined();
  });

  test("student self filter is not overwritten by name pushdown", () => {
    const q = buildEnrollmentQuery({
      user: { _id: "u-student", auth: "member" },
      registration: { role: "student" },
      seasonIds,
      mongoFilter: { studentName: "다른학생" },
    });
    expect(q.$and[0].student).toBe("u-student");
    expect(q.$and).toContainEqual({ studentName: "다른학생" });
  });

  test("evaluation labels hide student-private fields from students", () => {
    const formEvaluation = [
      { label: "멘토평가", auth: { view: { teacher: true, student: false } } },
      { label: "자기평가", auth: { view: { teacher: true, student: true } } },
    ];
    expect(
      visibleEvalLabels(formEvaluation, { auth: "member" }, { role: "student" })
    ).toEqual(["자기평가"]);
    expect(
      visibleEvalLabels(formEvaluation, { auth: "member" }, { role: "teacher" })
    ).toEqual(["멘토평가", "자기평가"]);
  });

  test("empty evaluation form fails closed for students", () => {
    const result = filterEvaluationForSearch({
      evaluation: { 멘토평가: "비공개", 자기평가: "공개처럼 보이는 값" },
      formEvaluation: [],
      user: { auth: "member" },
      registration: { role: "student" },
      evalColumns: [{ name: "멘토평가" }, { name: "자기평가" }],
    });
    expect(result.flat).toEqual({});
    expect(result.evaluationJson).toEqual({});
  });

  test("evaluation filtering follows the row season's visibility", () => {
    const result = filterEvaluationForSearch({
      evaluation: { 멘토평가: "비공개", 자기평가: "공개" },
      formEvaluation: [
        {
          label: "멘토평가",
          auth: { view: { teacher: true, student: false } },
        },
        {
          label: "자기평가",
          auth: { view: { teacher: true, student: true } },
        },
      ],
      user: { auth: "member" },
      registration: { role: "student" },
      evalColumns: [{ name: "멘토평가" }, { name: "자기평가" }],
    });
    expect(result.flat).toEqual({ 자기평가: "공개" });
    expect(result.evaluationJson).toEqual({ 자기평가: "공개" });
  });

  test("viewAndEditMyStudents only for homeroom teacher", () => {
    const item = { authTeacher: "viewAndEditMyStudents", authStudent: "view" };
    const teacher = { _id: "t1", auth: "member" };
    const other = { _id: "t2", auth: "member" };
    const studentReg = { user: "s1", teacher: "t1", subTeacher: "t3" };
    const reg = { role: "teacher" };
    expect(canReadArchiveItem(item, teacher, reg, studentReg)).toBe(true);
    expect(canReadArchiveItem(item, other, reg, studentReg)).toBe(false);
    expect(
      canReadArchiveItem(
        item,
        { _id: "s1", auth: "member" },
        { role: "student" },
        studentReg
      )
    ).toBe(true);
  });

  test("array archive expands one row per entry and object stays one row", () => {
    const item = {
      dataType: "array",
      fields: [
        { label: "일자 또는 기간" },
        { label: "시간" },
        { label: "주민등록번호" },
      ],
    };
    const sr = { user: "u1", userId: "kwon", userName: "권시은", grade: "12학년" };
    const rows = expandArchiveRows(item, sr, [
      {
        "일자 또는 기간": "2024.03.01",
        시간: "7",
        주민등록번호: "000000-0000000",
      },
      { "일자 또는 기간": "2024.05.01", 시간: "3" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]["일자 또는 기간"]).toBe("2024.03.01");
    expect(rows[0].시간).toBe("7");
    expect(rows[0].entry_index).toBe(1);
    expect(rows[1].시간).toBe("3");
    expect(rows[1].entry_index).toBe(2);
    expect(rows.every((r) => r.user_name === "권시은")).toBe(true);
    expect(rows[0]["주민등록번호"]).toBeUndefined();
    expect(rows[0].entries_json).not.toContain("000000-0000000");

    const objItem = {
      dataType: "object",
      fields: [{ label: "종합의견" }],
    };
    const one = expandArchiveRows(objItem, sr, { 종합의견: "성실함" });
    expect(one).toHaveLength(1);
    expect(one[0].종합의견).toBe("성실함");
  });

  test("value hint lists real grades and forbids guessed year filters", () => {
    const hint = formatRegistrationValueHint(
      {
        count: 12,
        grades: ["1", "2", "3"],
        years: ["2026학년도"],
        terms: ["3쿼터"],
        roles: ["student", "teacher"],
      },
      "current"
    );
    expect(hint).toContain("grade: 1, 2, 3");
    expect(hint).toContain("year: 2026학년도");
    expect(hint).toMatch(/위 목록과 스키마에 있는 값/);
  });
});
