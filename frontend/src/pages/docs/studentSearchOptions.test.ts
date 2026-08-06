import {
  filterStudentOptions,
  toStudentOption,
} from "./studentSearchOptions";
import { TRegistration } from "types/registrations";

const makeReg = (
  overrides: Partial<TRegistration> &
    Pick<TRegistration, "_id" | "user" | "userId" | "userName">
): TRegistration =>
  ({
    school: "s",
    season: "se",
    year: "2024",
    term: "1",
    isActivated: true,
    memos: [],
    permissionSyllabusV2: true,
    permissionEnrollmentV2: true,
    permissionEvaluationV2: true,
    formEvaluation: [],
    role: "student",
    ...overrides,
  }) as TRegistration;

describe("studentSearchOptions", () => {
  const options = [
    toStudentOption(
      makeReg({
        _id: "r1",
        user: "u1",
        userId: "1201",
        userName: "김민수",
        grade: "10학년",
        teacherName: "송건우",
        group: "A",
      })
    ),
    toStudentOption(
      makeReg({
        _id: "r2",
        user: "u2",
        userId: "1202",
        userName: "이서현",
        grade: "11학년",
        teacherName: "홍길동",
      })
    ),
  ];

  it("builds searchable option text from registration fields", () => {
    expect(options[0].label).toBe("김민수");
    expect(options[0].summary).toBe("김민수 · 1201 · 10학년");
    expect(options[0].description).toBe("1201 · 10학년 · 송건우 · A");
    expect(options[0].searchText).toContain("송건우");
  });

  it("filters by name, grade, and teacher", () => {
    expect(filterStudentOptions(options, "김", 30)).toHaveLength(1);
    expect(filterStudentOptions(options, "10학년", 30)[0].label).toBe(
      "김민수"
    );
    expect(filterStudentOptions(options, "홍길동", 30)[0].label).toBe(
      "이서현"
    );
  });

  it("returns limited list when query is empty", () => {
    expect(filterStudentOptions(options, "", 1)).toHaveLength(1);
  });
});
