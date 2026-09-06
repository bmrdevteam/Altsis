import { TAltForm } from "types/altForm";
import { TBoard } from "types/board";
import { TUser } from "types/users";
import {
  getMyAltBoardRole,
  isFormRespondent,
  userMatchesAccessList,
} from "./formAccess";

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

const baseBoard = {
  _id: "b1",
  school: "sch1",
  schoolId: "school1",
  schoolName: "학교",
  scope: "school" as const,
  isDefault: false,
  creator: "creator-oid",
  members: {
    groups: { manager: false, teacher: true, student: true },
    users: [{ user: "inv1", userId: "inv1", userName: "초대" }],
  },
  altBoardRole: {},
} as unknown as TBoard;

describe("getMyAltBoardRole", () => {
  const teacherUser = {
    _id: "t1",
    userId: "tea1",
    auth: "member" as const,
    schools: [{ school: "sch1", schoolId: "school1", schoolName: "학교" }],
  } as Pick<TUser, "_id" | "auth" | "userId" | "schools">;

  const studentUser = {
    _id: "s1",
    userId: "stu1",
    auth: "member" as const,
    schools: [{ school: "sch1", schoolId: "school1", schoolName: "학교" }],
  } as Pick<TUser, "_id" | "auth" | "userId" | "schools">;

  test("group teacher/student without altBoardRole is respondent", () => {
    expect(getMyAltBoardRole(baseBoard, teacherUser, "teacher")).toBe(
      "respondent"
    );
    expect(getMyAltBoardRole(baseBoard, studentUser, "student")).toBe(
      "respondent"
    );
  });

  test("rule A school affiliation without season role is respondent", () => {
    expect(getMyAltBoardRole(baseBoard, studentUser, null)).toBe("respondent");
  });

  test("invited user without altBoardRole is respondent", () => {
    const invited = {
      _id: "inv1",
      userId: "inv1",
      auth: "member" as const,
      schools: [],
    } as Pick<TUser, "_id" | "auth" | "userId" | "schools">;
    expect(getMyAltBoardRole(baseBoard, invited, null)).toBe("respondent");
  });

  test("outsider is not given a role", () => {
    const outsider = {
      _id: "out1",
      userId: "out1",
      auth: "member" as const,
      schools: [{ school: "x", schoolId: "other", schoolName: "다른" }],
    } as Pick<TUser, "_id" | "auth" | "userId" | "schools">;
    const closed = {
      ...baseBoard,
      members: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
    } as TBoard;
    expect(getMyAltBoardRole(closed, outsider, "student")).toBe(null);
  });

  test("school manager without membership is not given a role", () => {
    const manager = {
      _id: "mgr1",
      userId: "mgr1",
      auth: "manager" as const,
      schools: [{ school: "sch1", schoolId: "school1", schoolName: "학교" }],
    } as Pick<TUser, "_id" | "auth" | "userId" | "schools">;
    const closed = {
      ...baseBoard,
      members: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
    } as TBoard;
    expect(getMyAltBoardRole(closed, manager, "manager")).toBe(null);
  });

  test("explicit altBoardRole and creator still win", () => {
    const board = {
      ...baseBoard,
      altBoardRole: { w1: "writer" },
    } as TBoard;
    expect(
      getMyAltBoardRole(
        board,
        {
          _id: "w1",
          userId: "w1",
          auth: "member",
          schools: [],
        } as Pick<TUser, "_id" | "auth" | "userId" | "schools">,
        "teacher"
      )
    ).toBe("writer");
    expect(
      getMyAltBoardRole(
        board,
        {
          _id: "creator-oid",
          userId: "cre",
          auth: "member",
          schools: [],
        } as Pick<TUser, "_id" | "auth" | "userId" | "schools">,
        null
      )
    ).toBe("admin");
  });
});
