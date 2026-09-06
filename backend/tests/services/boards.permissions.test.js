import {
  canManageBoard,
  isBoardMember,
  isBoardMemberAsUser,
  isBoardWriter,
  validatePostPermission,
  nextAltRoleOnAddWriter,
  nextAltRoleOnRemoveWriter,
  lookupAltBoardRole,
  resolveAltBoardRole,
  resolveFormApprovalCandidates,
} from "../../src/services/boards.js";

const oid = (id) => ({
  equals: (other) => String(other) === id,
  toString: () => id,
});

describe("board permission helpers", () => {
  const creatorOid = "creator-oid";
  const memberOid = "member-oid";
  const outsiderOid = "outsider-oid";

  const schoolBoard = {
    scope: "school",
    schoolId: "school1",
    isDefault: false,
    creator: oid(creatorOid),
    creatorId: "creator",
    members: {
      groups: { manager: false, teacher: true, student: false },
      users: [
        { user: memberOid, userId: "member1", userName: "멤버" },
      ],
    },
    writers: {
      groups: { manager: false, teacher: false, student: false },
      users: [],
    },
    altBoardRole: {
      [memberOid]: "respondent",
      "admin-oid": "admin",
    },
  };

  test("isBoardMember and isBoardMemberAsUser agree for group teacher", () => {
    const user = {
      _id: oid("teacher-oid"),
      userId: "teacher1",
      auth: "member",
      schools: [{ schoolId: "school1" }],
    };
    expect(isBoardMember(schoolBoard, user, "teacher")).toBe(true);
    expect(isBoardMemberAsUser(schoolBoard, user, "teacher")).toBe(true);
  });

  test("isBoardMember and isBoardMemberAsUser agree for rule A school affiliation", () => {
    const user = {
      _id: oid("affil-oid"),
      userId: "affil1",
      auth: "member",
      schools: [{ schoolId: "school1" }],
    };
    // teacher/student 그룹이 켜져 있으면 시즌 role 없이도 접근
    expect(isBoardMember(schoolBoard, user, null)).toBe(true);
    expect(isBoardMemberAsUser(schoolBoard, user, null)).toBe(true);
  });

  test("admin can access detail but list requires real membership", () => {
    const user = { _id: oid("admin1"), userId: "admin", auth: "admin" };
    expect(isBoardMember(schoolBoard, user, null)).toBe(true);
    expect(isBoardMemberAsUser(schoolBoard, user, null)).toBe(false);
  });

  test("manager appears in list when manager group is enabled", () => {
    const board = {
      ...schoolBoard,
      members: {
        groups: { manager: true, teacher: false, student: false },
        users: [],
      },
      altBoardRole: {},
    };
    const user = { _id: oid("mgr1"), userId: "mgr1", auth: "manager" };
    expect(isBoardMemberAsUser(board, user, null)).toBe(true);
    expect(isBoardMember(board, user, null)).toBe(true);
  });

  test("outsider without invite/group is not a member", () => {
    const user = {
      _id: oid(outsiderOid),
      userId: "outsider",
      auth: "member",
      schools: [{ schoolId: "other" }],
    };
    const closedBoard = {
      ...schoolBoard,
      members: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
      altBoardRole: {},
    };
    expect(isBoardMember(closedBoard, user, "student")).toBe(false);
    expect(isBoardMemberAsUser(closedBoard, user, "student")).toBe(false);
  });

  test("canManageBoard allows creator, manager, and altBoardRole admin", () => {
    expect(
      canManageBoard(schoolBoard, {
        _id: oid(creatorOid),
        auth: "member",
      })
    ).toBe(true);
    expect(
      canManageBoard(schoolBoard, { _id: oid("x"), auth: "manager" })
    ).toBe(true);
    expect(
      canManageBoard(schoolBoard, {
        _id: oid("admin-oid"),
        auth: "member",
      })
    ).toBe(true);
    expect(
      canManageBoard(schoolBoard, {
        _id: oid(memberOid),
        auth: "member",
      })
    ).toBe(false);
  });

  test("isBoardWriter honors configured writer role groups", () => {
    const board = {
      ...schoolBoard,
      writers: {
        groups: { manager: false, teacher: true, student: false },
        users: [],
      },
    };
    const teacher = {
      _id: oid("teacher-oid"),
      userId: "teacher",
      auth: "member",
    };
    expect(isBoardWriter(board, teacher, "teacher")).toBe(true);
    expect(isBoardWriter(board, teacher, "student")).toBe(false);
  });

  test("lookupAltBoardRole works for Map and plain object", () => {
    expect(lookupAltBoardRole(schoolBoard, "admin-oid")).toBe("admin");
    const mapBoard = {
      altBoardRole: new Map([["admin-oid", "admin"]]),
    };
    expect(lookupAltBoardRole(mapBoard, "admin-oid")).toBe("admin");
  });

  test("nextAltRoleOnAddWriter preserves admin", () => {
    expect(nextAltRoleOnAddWriter("admin")).toBe("admin");
    expect(nextAltRoleOnAddWriter("respondent")).toBe("writer");
    expect(nextAltRoleOnAddWriter(undefined)).toBe("writer");
  });

  test("nextAltRoleOnRemoveWriter preserves admin when still member", () => {
    expect(nextAltRoleOnRemoveWriter("admin", true)).toBe("admin");
    expect(nextAltRoleOnRemoveWriter("writer", true)).toBe("respondent");
    expect(nextAltRoleOnRemoveWriter("writer", false)).toBe(null);
  });

  test("validatePostPermission rejects empty users", () => {
    const result = validatePostPermission(schoolBoard, {
      groups: { manager: false, teacher: false, student: false },
      users: [],
    });
    expect(result.valid).toBe(false);
  });

  test("validatePostPermission rejects non-member userId", () => {
    const result = validatePostPermission(schoolBoard, {
      users: [{ user: outsiderOid, userId: "outsider", userName: "외부" }],
    });
    expect(result.valid).toBe(false);
  });

  test("validatePostPermission accepts invited member", () => {
    const result = validatePostPermission(schoolBoard, {
      users: [{ user: memberOid, userId: "member1", userName: "멤버" }],
    });
    expect(result.valid).toBe(true);
  });

  test("validatePostPermission accepts altBoardRole-only member by oid", () => {
    const board = {
      ...schoolBoard,
      members: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
      altBoardRole: { [memberOid]: "respondent" },
    };
    const result = validatePostPermission(board, {
      users: [{ user: memberOid, userId: "member1", userName: "멤버" }],
    });
    expect(result.valid).toBe(true);
  });
});

describe("resolveAltBoardRole", () => {
  const groupBoard = {
    scope: "school",
    schoolId: "school1",
    isDefault: false,
    creator: oid("creator-oid"),
    members: {
      groups: { manager: false, teacher: true, student: true },
      users: [{ user: "invited-oid", userId: "inv1", userName: "초대" }],
    },
    altBoardRole: {},
  };

  test("group teacher/student without altBoardRole is respondent", () => {
    const teacher = {
      _id: oid("teacher-oid"),
      userId: "teacher1",
      auth: "member",
      schools: [{ schoolId: "school1" }],
    };
    const student = {
      _id: oid("student-oid"),
      userId: "student1",
      auth: "member",
      schools: [{ schoolId: "school1" }],
    };
    expect(resolveAltBoardRole(groupBoard, teacher, "teacher")).toBe(
      "respondent"
    );
    expect(resolveAltBoardRole(groupBoard, student, "student")).toBe(
      "respondent"
    );
  });

  test("rule A school affiliation without season role is respondent", () => {
    const user = {
      _id: oid("affil-oid"),
      userId: "affil1",
      auth: "member",
      schools: [{ schoolId: "school1" }],
    };
    expect(resolveAltBoardRole(groupBoard, user, null)).toBe("respondent");
  });

  test("invited user without altBoardRole is respondent", () => {
    const invited = {
      _id: oid("invited-oid"),
      userId: "inv1",
      auth: "member",
    };
    expect(resolveAltBoardRole(groupBoard, invited, null)).toBe("respondent");
  });

  test("outsider is not given a role", () => {
    const outsider = {
      _id: oid("outsider-oid"),
      userId: "outsider",
      auth: "member",
      schools: [{ schoolId: "other" }],
    };
    const closed = {
      ...groupBoard,
      members: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
    };
    expect(resolveAltBoardRole(closed, outsider, "student")).toBe(null);
  });

  test("school manager without membership is not given a role", () => {
    const manager = {
      _id: oid("mgr1"),
      userId: "mgr1",
      auth: "manager",
      schools: [{ schoolId: "school1" }],
    };
    const closed = {
      ...groupBoard,
      members: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
    };
    expect(resolveAltBoardRole(closed, manager, "manager")).toBe(null);
  });

  test("explicit altBoardRole and creator still win", () => {
    const board = {
      ...groupBoard,
      altBoardRole: { "writer-oid": "writer" },
    };
    expect(
      resolveAltBoardRole(
        board,
        { _id: oid("writer-oid"), userId: "w1", auth: "member" },
        "teacher"
      )
    ).toBe("writer");
    expect(
      resolveAltBoardRole(
        board,
        { _id: oid("creator-oid"), userId: "cre", auth: "member" },
        null
      )
    ).toBe("admin");
  });
});

describe("resolveFormApprovalCandidates", () => {
  const members = [
    { user: "admin-oid", userId: "adm", userName: "보드관리자" },
    { user: "writer-oid", userId: "w2", userName: "보드작성자" },
    { user: "teacher-oid", userId: "tea", userName: "교사", role: "teacher" },
    { user: "mgr-oid", userId: "mgr", userName: "학교관리자", auth: "manager" },
    { user: "g1", userId: "bmrlove", userName: "구본길" },
  ];
  const board = {
    creator: "creator-oid",
    creatorId: "temman92",
    creatorName: "홍길동",
    writers: {
      groups: { manager: true, teacher: true, student: false },
      users: [{ user: "w1-oid", userId: "w1", userName: "작성자" }],
    },
    altBoardRole: { "admin-oid": "admin", "writer-oid": "writer" },
  };

  test("custom form writers are the only pick candidates", () => {
    const form = {
      writers: {
        groups: { manager: false, teacher: false, student: false },
        users: [
          { user: "g1", userId: "bmrlove", userName: "구본길" },
          { user: "g1-dup", userId: "bmrlove", userName: "중복" },
        ],
      },
    };
    expect(resolveFormApprovalCandidates(form, board, members)).toEqual([
      { user: "g1", userId: "bmrlove", userName: "구본길" },
    ]);
  });

  test("inherit form writers uses board writer users, admin, writer role, and creator", () => {
    expect(resolveFormApprovalCandidates({}, board, members)).toEqual([
      { user: "w1-oid", userId: "w1", userName: "작성자" },
      { user: "admin-oid", userId: "adm", userName: "보드관리자" },
      { user: "writer-oid", userId: "w2", userName: "보드작성자" },
      { user: "creator-oid", userId: "temman92", userName: "홍길동" },
    ]);
  });

  test("inherit does not add teacher group or school manager", () => {
    const noRoles = {
      ...board,
      writers: { groups: { teacher: true, manager: false, student: false }, users: [] },
      altBoardRole: {},
    };
    const ids = resolveFormApprovalCandidates(null, noRoles, members).map(
      (u) => u.userId
    );
    expect(ids).toEqual(["temman92"]);
    expect(ids).not.toContain("tea");
    expect(ids).not.toContain("mgr");
  });
});
