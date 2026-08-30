import {
  evalColumnsFromItems,
  filterPushdownByDict,
  formatSearchSchemaHint,
  pickEvalColumnValues,
  samePushdown,
} from "../../src/services/alterSearchPeek.js";
import { collectEvalColumns } from "../../src/services/alterSearchCatalog.js";
import { buildSqlPrompt } from "../../src/services/alterSearch.js";
import { extractPushdownFilters } from "../../src/services/alterSearchPushdown.js";

const form = [
  {
    label: "성취도",
    type: "select",
    options: ["A", "B", "C", "P", "F"],
    auth: { view: { teacher: true, student: true } },
  },
  {
    label: "평어",
    auth: { view: { teacher: true, student: false } },
  },
];

describe("alterSearchPeek", () => {
  test("evalColumnsFromItems skips reserved names and keeps select options", () => {
    const cols = evalColumnsFromItems([
      { label: "student_grade" },
      { label: "성취도", options: ["A", "B", "C", "P", "F"] },
    ]);
    expect(cols.map((c) => c.name)).toEqual(["성취도"]);
    expect(cols[0].comment).toMatch(/A, B, C, P, F/);
  });

  test("collectEvalColumns respects student visibility", () => {
    const teacherCols = collectEvalColumns(
      [form],
      { auth: "member" },
      { role: "teacher" }
    );
    expect(teacherCols.map((c) => c.name)).toEqual(["성취도", "평어"]);
    const studentCols = collectEvalColumns(
      [form],
      { auth: "member" },
      { role: "student" }
    );
    expect(studentCols.map((c) => c.name)).toEqual(["성취도"]);
  });

  test("pickEvalColumnValues fills flattened labels", () => {
    const cols = evalColumnsFromItems(form);
    const flat = pickEvalColumnValues({ 성취도: "A", 평어: "성실" }, cols);
    expect(flat.성취도).toBe("A");
    expect(flat.평어).toBe("성실");
    expect(pickEvalColumnValues({}, cols).성취도).toBe("");
  });

  test("filterPushdownByDict drops studentGrade not in peek", () => {
    const raw = extractPushdownFilters(
      "SELECT * FROM enrollments WHERE student_grade = '12' AND student_name = '권시은'"
    );
    expect(raw.enrollments.studentGrade).toBe("12");
    const gated = filterPushdownByDict(raw, {
      grades: ["12학년"],
      studentGrades: ["12학년"],
    });
    expect(gated.enrollments.studentGrade).toBeUndefined();
    expect(gated.enrollments.studentName).toBe("권시은");
    expect(samePushdown(raw.enrollments, gated.enrollments)).toBe(false);
  });

  test("filterPushdownByDict keeps literals that exist in the dict", () => {
    const raw = extractPushdownFilters(
      "SELECT * FROM enrollments WHERE student_grade = '12학년'"
    );
    const gated = filterPushdownByDict(raw, {
      studentGrades: ["12학년"],
    });
    expect(gated.enrollments.studentGrade).toBe("12학년");
  });

  test("formatSearchSchemaHint lists eval columns and forbids guessed JSON keys", () => {
    const hint = formatSearchSchemaHint(
      {
        count: 12,
        grades: ["12학년"],
        studentGrades: ["12학년"],
        years: ["2026학년도"],
        terms: ["2쿼터"],
        roles: ["student"],
        evalColumns: [
          { name: "성취도", options: ["A", "B", "C", "P", "F"] },
        ],
      },
      "current"
    );
    expect(hint).toContain("grade: 12학년");
    expect(hint).toContain("student_grade: 12학년");
    expect(hint).toContain('"성취도" 값: A, B, C, P, F');
    expect(hint).toMatch(/JSON_EXTRACT/);
    expect(hint).toMatch(/COUNT\(DISTINCT student_id\)/);
    expect(hint).toMatch(/위 목록과 스키마에 있는 값/);
  });

  test("formatSearchSchemaHint lists form tables and options", () => {
    const hint = formatSearchSchemaHint({
      count: 1,
      grades: ["12학년"],
      studentGrades: ["12학년"],
      years: ["2026학년도"],
      terms: ["3쿼터"],
      roles: ["student"],
      formTables: [
        {
          name: "form_컴퓨터_신청",
          title: "컴퓨터 신청 프로그램",
          columns: [{ name: "컴퓨터", options: ["신청", "미신청"] }],
        },
      ],
      overflowFormTitles: ["오래된 설문"],
    });
    expect(hint).toContain("form_컴퓨터_신청");
    expect(hint).toContain("제목=컴퓨터 신청 프로그램");
    expect(hint).toContain("컴퓨터(선택: 신청, 미신청)");
    expect(hint).toContain("오래된 설문");
  });

  test("buildSqlPrompt forbids invented eval keys and enrollment-as-student", () => {
    const prompt = buildSqlPrompt({
      ddl: 'CREATE TABLE enrollment_evaluations ("성취도" TEXT);',
      message: "2쿼터 성취도 분포",
      seasonNote: "범위: 현재 학기",
      valueHint: formatSearchSchemaHint({
        count: 1,
        grades: ["12학년"],
        studentGrades: ["12학년"],
        years: ["2026학년도"],
        terms: ["2쿼터"],
        roles: ["student"],
        evalColumns: [{ name: "성취도", options: ["A"] }],
      }),
    });
    expect(prompt).toMatch(/COUNT\(DISTINCT student_id\)/);
    expect(prompt).toMatch(/JSON_EXTRACT/);
  });

  test("buildSqlPrompt tells the model to use form_* columns", () => {
    const prompt = buildSqlPrompt({
      ddl: 'CREATE TABLE form_컴퓨터_신청 ("컴퓨터" TEXT);',
      message: "컴퓨터 신청 비율",
      seasonNote: "범위: 현재 학기",
    });
    expect(prompt).toMatch(/form_\*/);
    expect(prompt).toMatch(/answers_json/);
  });
});
