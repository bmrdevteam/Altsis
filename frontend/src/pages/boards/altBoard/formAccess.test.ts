import { TAltForm } from "types/altForm";
import { isFormRespondent, userMatchesAccessList } from "./formAccess";

const studentOnlyForm = {
  _id: "f1",
  members: {
    groups: { manager: false, teacher: false, student: true },
    users: [],
  },
} as TAltForm;

const inheritForm = { _id: "f2" } as TAltForm;

const student = { _id: "s1", userId: "stu1", auth: "member" as const };
const teacher = { _id: "t1", userId: "tea1", auth: "member" as const };

describe("isFormRespondent", () => {
  test("custom student members: student is respondent, teacher is not", () => {
    expect(isFormRespondent(studentOnlyForm, student, "respondent", "student")).toBe(
      true
    );
    expect(isFormRespondent(studentOnlyForm, teacher, "admin", "teacher")).toBe(
      false
    );
    expect(isFormRespondent(studentOnlyForm, teacher, "writer", "teacher")).toBe(
      false
    );
  });

  test("inherit members: any board role is a respondent", () => {
    expect(isFormRespondent(inheritForm, teacher, "admin", "teacher")).toBe(
      true
    );
    expect(isFormRespondent(inheritForm, student, "respondent", "student")).toBe(
      true
    );
  });

  test("no board role is not a respondent", () => {
    expect(isFormRespondent(studentOnlyForm, teacher, null, "teacher")).toBe(
      false
    );
  });
});

describe("userMatchesAccessList", () => {
  test("matches school role group", () => {
    expect(
      userMatchesAccessList(studentOnlyForm.members, student, "student")
    ).toBe(true);
    expect(
      userMatchesAccessList(studentOnlyForm.members, teacher, "teacher")
    ).toBe(false);
  });
});
