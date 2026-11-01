import {
  isStudentEditableField,
  isStudentViewField,
  isTeacherEditableField,
  resolveFormEvaluation,
} from "../../src/utils/evaluationForm.js";

describe("resolveFormEvaluation", () => {
  test("empty registration form falls back to the season form", () => {
    const season = [{ label: "멘토평가" }];
    expect(resolveFormEvaluation([], season)).toEqual(season);
    expect(resolveFormEvaluation(undefined, season)).toEqual(season);
  });

  test("non-empty registration form wins", () => {
    const registration = [{ label: "점수" }];
    expect(resolveFormEvaluation(registration, [{ label: "멘토평가" }])).toEqual(
      registration
    );
  });
});

describe("evaluation field auth", () => {
  test("missing auth uses authOption and defaults to teacher edit", () => {
    expect(isTeacherEditableField({ label: "멘토평가" })).toBe(true);
    expect(
      isTeacherEditableField({ label: "멘토평가", authOption: "editByTeacher" })
    ).toBe(true);
    expect(
      isTeacherEditableField({ label: "자기평가", authOption: "editByStudent" })
    ).toBe(false);
    expect(
      isStudentEditableField({ label: "자기평가", authOption: "editByStudent" })
    ).toBe(true);
    expect(
      isStudentViewField({
        label: "멘토평가",
        authOption: "editByTeacherAndStudentCanView",
      })
    ).toBe(true);
  });

  test("explicit auth.edit.teacher false is not overridden by authOption", () => {
    expect(
      isTeacherEditableField({
        label: "멘토평가",
        authOption: "editByTeacher",
        auth: { edit: { teacher: false, student: false } },
      })
    ).toBe(false);
  });
});
