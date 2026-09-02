import {
  filterApprovalCandidates,
  searchListPlacement,
  uniqueApprovalCandidates,
} from "./ApprovalCirculationPicker";
import { TApprovalApprover } from "utils/approvalLine";

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

describe("searchListPlacement", () => {
  const input = { top: 500, bottom: 536, left: 80, width: 240 };

  test("opens below when the max-height list fits", () => {
    expect(searchListPlacement(input, 900, 320)).toEqual({
      left: 80,
      width: 240,
      top: 540,
    });
  });

  test("anchors to the input bottom when flipping up", () => {
    expect(searchListPlacement(input, 600, 320)).toEqual({
      left: 80,
      width: 240,
      bottom: 104,
    });
  });
});
