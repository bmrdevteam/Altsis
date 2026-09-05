import {
  approvalCandidatesForBoard,
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

describe("board workflow candidates", () => {
  const board = {
    creator: "creator-oid",
    creatorId: "creator",
    creatorName: "생성자",
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
  ];

  test("approval candidates include creator, writer, admin, and writer groups", () => {
    expect(
      approvalCandidatesForBoard(board, members).map((user) => user.userId)
    ).toEqual(["admin", "teacher", "writer", "creator"]);
  });

  test("circulation candidates include all resolved members and creator", () => {
    expect(
      circulationCandidatesForBoard(board, members).map((user) => user.userId)
    ).toEqual(["admin", "teacher", "student", "writer", "creator"]);
  });
});
