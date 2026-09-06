import {
  approvalCandidatesForForm,
  circulationCandidatesForBoard,
  filterApprovalCandidates,
  uniqueApprovalCandidates,
} from "./ApprovalCirculationPicker";
import { TApprovalApprover } from "utils/approvalLine";
import { TBoard } from "types/board";

const users: TApprovalApprover[] = [
  { user: "1", userId: "kim01", userName: "김교사" },
  { user: "2", userId: "lee02", userName: "이학생" },
  { user: "3", userId: "Park03", userName: "박관리" },
];

describe("filterApprovalCandidates", () => {
  test("empty query returns all except excluded ids", () => {
    expect(filterApprovalCandidates(users, "")).toEqual(users);
    expect(filterApprovalCandidates(users, "   ")).toEqual(users);
    expect(filterApprovalCandidates(users, "", ["lee02"])).toEqual([
      users[0],
      users[2],
    ]);
  });

  test("filters by name substring", () => {
    expect(filterApprovalCandidates(users, "교사")).toEqual([users[0]]);
    expect(filterApprovalCandidates(users, "학")).toEqual([users[1]]);
  });

  test("filters userId case-insensitively", () => {
    expect(filterApprovalCandidates(users, "PARK03")).toEqual([users[2]]);
    expect(filterApprovalCandidates(users, "kim")).toEqual([users[0]]);
  });

  test("excludes selected ids from filtered results", () => {
    expect(filterApprovalCandidates(users, "0", new Set(["kim01"]))).toEqual([
      users[1],
      users[2],
    ]);
  });

  test("returns empty when nothing matches", () => {
    expect(filterApprovalCandidates(users, "없는값")).toEqual([]);
  });
});

describe("uniqueApprovalCandidates", () => {
  test("dedupes by userId and skips empty lists", () => {
    expect(
      uniqueApprovalCandidates(
        [{ user: "1", userId: "kim01", userName: "김교사" }],
        [
          { user: "9", userId: "kim01", userName: "중복" },
          { userId: "lee02", userName: "이학생" },
        ],
        undefined
      )
    ).toEqual([
      { user: "1", userId: "kim01", userName: "김교사" },
      { user: "", userId: "lee02", userName: "이학생" },
    ]);
  });
});

describe("form approval candidates", () => {
  const board = {
    creator: "creator-oid",
    creatorId: "temman92",
    creatorName: "홍길동",
    writers: {
      groups: { manager: false, teacher: true, student: false },
      users: [{ user: "writer-oid", userId: "writer", userName: "작성자" }],
    },
    members: {
      groups: { manager: true, teacher: true, student: true },
      users: [],
    },
    altBoardRole: {
      "admin-oid": "admin",
      "student-oid": "respondent",
    },
  } as unknown as TBoard;
  const members = [
    { user: "admin-oid", userId: "admin", userName: "관리자" },
    { user: "teacher-oid", userId: "teacher", userName: "교사", role: "teacher" as const },
    { user: "student-oid", userId: "student", userName: "학생", role: "student" as const },
    { user: "g1", userId: "bmrlove", userName: "구본길" },
    { user: "g2", userId: "leadingschool", userName: "김성수" },
    { user: "creator-oid", userId: "temman92", userName: "홍길동" },
  ];

  test("custom form writers list is the only pick candidates", () => {
    const form = {
      writers: {
        groups: { manager: false, teacher: false, student: false },
        users: [
          { user: "g1", userId: "bmrlove", userName: "구본길" },
          { user: "g2", userId: "leadingschool", userName: "김성수" },
        ],
      },
    };
    expect(
      approvalCandidatesForForm(form, board, members).map((user) => user.userId)
    ).toEqual(["bmrlove", "leadingschool"]);
  });

  test("custom form writers omit creator who is not on the list", () => {
    const form = {
      writers: {
        groups: { manager: false, teacher: false, student: false },
        users: [{ user: "g1", userId: "bmrlove", userName: "구본길" }],
      },
    };
    const ids = approvalCandidatesForForm(form, board, members).map(
      (user) => user.userId
    );
    expect(ids).not.toContain("temman92");
    expect(ids).not.toContain("admin");
    expect(ids).not.toContain("teacher");
  });

  test("inherit form writers uses board admin, writer, and creator", () => {
    const inheritBoard = {
      ...board,
      writers: { ...board.writers, users: [] },
      altBoardRole: {
        "admin-oid": "admin",
        "writer-oid": "writer",
        "student-oid": "respondent",
      },
    } as unknown as TBoard;
    const withWriter = [
      ...members,
      { user: "writer-oid", userId: "writer", userName: "작성자" },
    ];
    expect(
      approvalCandidatesForForm({}, inheritBoard, withWriter).map(
        (user) => user.userId
      )
    ).toEqual(["admin", "writer", "temman92"]);
  });

  test("inherit form writers does not add teacher group or school manager", () => {
    const inheritBoard = {
      ...board,
      writers: { ...board.writers, users: [] },
      altBoardRole: {},
    } as unknown as TBoard;
    const withManager = [
      ...members,
      {
        user: "mgr-oid",
        userId: "mgr",
        userName: "학교관리자",
        auth: "manager" as const,
      },
    ];
    expect(
      approvalCandidatesForForm(undefined, inheritBoard, withManager).map(
        (user) => user.userId
      )
    ).toEqual(["temman92"]);
  });

  test("circulation candidates include all resolved members and creator", () => {
    expect(
      circulationCandidatesForBoard(board, members).map((user) => user.userId)
    ).toEqual([
      "admin",
      "teacher",
      "student",
      "bmrlove",
      "leadingschool",
      "temman92",
      "writer",
    ]);
  });
});
