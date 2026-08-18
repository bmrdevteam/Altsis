import {
  isAccessListCustom,
  normalizeFormAccess,
  isFormMember,
  canViewAllRows,
  canModifyForm,
  canManageForm,
  isFormRespondent,
} from "../../src/services/altForms.js";

const oid = (id) => ({
  equals: (other) => String(other) === id,
  toString: () => id,
});

const emptyAccess = () => ({
  groups: { manager: false, teacher: false, student: false },
  users: [],
});

const studentUser = {
  _id: oid("student-oid"),
  userId: "stu1",
  userName: "학생",
  auth: "member",
};

const teacherUser = {
  _id: oid("teacher-oid"),
  userId: "tea1",
  userName: "교사",
  auth: "member",
};

const writerUser = {
  _id: oid("writer-oid"),
  userId: "wrt1",
  userName: "작성",
  auth: "member",
};

const adminUser = {
  _id: oid("admin-oid"),
  userId: "adm1",
  userName: "관리",
  auth: "member",
};

const creatorUser = {
  _id: oid("creator-oid"),
  userId: "cre1",
  userName: "작성자",
  auth: "member",
};

const otherUser = {
  _id: oid("other-oid"),
  userId: "oth1",
  userName: "기타",
  auth: "member",
};

const outsiderUser = {
  _id: oid("outsider-oid"),
  userId: "out1",
  userName: "외부",
  auth: "member",
};

const managerUser = {
  _id: oid("manager-oid"),
  userId: "mgr1",
  userName: "매니저",
  auth: "manager",
};

const board = {
  creator: oid("creator-oid"),
  altBoardRole: {
    "student-oid": "respondent",
    "teacher-oid": "respondent",
    "writer-oid": "writer",
    "admin-oid": "admin",
    "other-oid": "respondent",
  },
};

const inheritForm = {
  creator: oid("creator-oid"),
  isDraft: false,
};

describe("altForm access lists", () => {
  test("empty or missing access is inherit (not custom)", () => {
    expect(isAccessListCustom(undefined)).toBe(false);
    expect(isAccessListCustom(null)).toBe(false);
    expect(isAccessListCustom(emptyAccess())).toBe(false);
    expect(normalizeFormAccess(emptyAccess())).toBeUndefined();
  });

  test("groups or users make the list custom", () => {
    expect(
      isAccessListCustom({
        groups: { manager: false, teacher: true, student: false },
        users: [],
      })
    ).toBe(true);
    expect(
      isAccessListCustom({
        groups: emptyAccess().groups,
        users: [{ user: "student-oid", userId: "stu1", userName: "학생" }],
      })
    ).toBe(true);
  });
});

describe("inherit form permissions (board)", () => {
  test("board respondent is a member and can respond, not view all rows", () => {
    expect(isFormMember(inheritForm, board, studentUser, "student")).toBe(true);
    expect(canViewAllRows(inheritForm, board, studentUser, "student")).toBe(
      false
    );
  });

  test("board writer can view all rows but cannot modify the builder", () => {
    expect(isFormMember(inheritForm, board, writerUser, "teacher")).toBe(true);
    expect(canViewAllRows(inheritForm, board, writerUser, "teacher")).toBe(true);
    expect(canManageForm(board, writerUser)).toBe(true);
    expect(canModifyForm(inheritForm, board, writerUser)).toBe(false);
  });

  test("board admin and form creator can modify the builder", () => {
    expect(canModifyForm(inheritForm, board, adminUser)).toBe(true);
    expect(canModifyForm(inheritForm, board, creatorUser)).toBe(true);
    expect(canViewAllRows(inheritForm, board, adminUser, "teacher")).toBe(true);
  });

  test("system manager bypasses member and writer checks", () => {
    expect(isFormMember(inheritForm, board, managerUser, null)).toBe(true);
    expect(canViewAllRows(inheritForm, board, managerUser, null)).toBe(true);
    expect(canModifyForm(inheritForm, board, managerUser)).toBe(true);
  });

  test("outsider without board role is not a member", () => {
    expect(isFormMember(inheritForm, board, outsiderUser, "student")).toBe(
      false
    );
    expect(canViewAllRows(inheritForm, board, outsiderUser, "student")).toBe(
      false
    );
  });
});

describe("custom form members", () => {
  const form = {
    ...inheritForm,
    members: {
      groups: { manager: false, teacher: false, student: true },
      users: [{ user: "teacher-oid", userId: "tea1", userName: "교사" }],
    },
  };

  test("listed user or matching group among board members can submit", () => {
    expect(isFormMember(form, board, studentUser, "student")).toBe(true);
    expect(isFormMember(form, board, teacherUser, "teacher")).toBe(true);
  });

  test("board writer still counts as a member when writers inherit", () => {
    expect(isFormMember(form, board, writerUser, "teacher")).toBe(true);
    expect(canViewAllRows(form, board, writerUser, "teacher")).toBe(true);
  });

  test("other board members are excluded", () => {
    expect(isFormMember(form, board, otherUser, "teacher")).toBe(false);
    expect(canViewAllRows(form, board, otherUser, "teacher")).toBe(false);
  });

  test("admin and creator still pass", () => {
    expect(isFormMember(form, board, adminUser, "teacher")).toBe(true);
    expect(isFormMember(form, board, creatorUser, "teacher")).toBe(true);
  });
});

describe("custom form writers", () => {
  const form = {
    ...inheritForm,
    members: {
      groups: { manager: false, teacher: false, student: true },
      users: [],
    },
    writers: {
      groups: { manager: false, teacher: true, student: false },
      users: [{ user: "student-oid", userId: "stu1", userName: "학생" }],
    },
  };

  test("form writers can view all rows even if they are board respondents", () => {
    expect(canViewAllRows(form, board, studentUser, "student")).toBe(true);
    expect(isFormMember(form, board, studentUser, "student")).toBe(true);
  });

  test("teacher group among board members can view all rows", () => {
    expect(canViewAllRows(form, board, teacherUser, "teacher")).toBe(true);
    expect(isFormMember(form, board, teacherUser, "teacher")).toBe(true);
  });

  test("board writer not in form writers cannot view all rows", () => {
    expect(canViewAllRows(form, board, writerUser, null)).toBe(false);
    expect(isFormMember(form, board, writerUser, null)).toBe(false);
  });

  test("form writer cannot modify the builder", () => {
    expect(canModifyForm(form, board, studentUser)).toBe(false);
    expect(canModifyForm(form, board, teacherUser)).toBe(false);
  });

  test("non-member teacher outside the board cannot view all rows via group", () => {
    expect(canViewAllRows(form, board, outsiderUser, "teacher")).toBe(false);
  });

  test("board admin still views all rows", () => {
    expect(canViewAllRows(form, board, adminUser, "teacher")).toBe(true);
  });
});

describe("isFormRespondent (submit / unsubmitted todo)", () => {
  const studentOnly = {
    ...inheritForm,
    members: {
      groups: { manager: false, teacher: false, student: true },
      users: [],
    },
  };

  test("custom student members: student submits, teacher staff does not", () => {
    expect(isFormRespondent(studentOnly, board, studentUser, "student")).toBe(
      true
    );
    expect(isFormRespondent(studentOnly, board, teacherUser, "teacher")).toBe(
      false
    );
    expect(isFormRespondent(studentOnly, board, writerUser, "teacher")).toBe(
      false
    );
    expect(isFormRespondent(studentOnly, board, adminUser, "teacher")).toBe(
      false
    );
    expect(isFormRespondent(studentOnly, board, creatorUser, "teacher")).toBe(
      false
    );
  });

  test("staff still count as form members for access", () => {
    expect(isFormMember(studentOnly, board, adminUser, "teacher")).toBe(true);
    expect(isFormMember(studentOnly, board, creatorUser, "teacher")).toBe(true);
    expect(isFormMember(studentOnly, board, writerUser, "teacher")).toBe(true);
  });

  test("inherit members: any board role is a respondent", () => {
    expect(isFormRespondent(inheritForm, board, studentUser, "student")).toBe(
      true
    );
    expect(isFormRespondent(inheritForm, board, writerUser, "teacher")).toBe(
      true
    );
  });

  test("outsider is not a respondent", () => {
    expect(
      isFormRespondent(studentOnly, board, outsiderUser, "student")
    ).toBe(false);
  });
});
