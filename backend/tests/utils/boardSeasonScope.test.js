import {
  isSeasonScopedBoard,
  canBypassSeasonRegistration,
  isBoardVisibleForSeason,
  isUserAssignedToSchool,
  grantsSchoolAffiliationAccess,
} from "../../src/utils/boardSeasonScope.js";

describe("boardSeasonScope helpers", () => {
  test("isSeasonScopedBoard requires scope season and season id", () => {
    expect(isSeasonScopedBoard({ scope: "school" })).toBe(false);
    expect(isSeasonScopedBoard({ scope: "season" })).toBe(false);
    expect(
      isSeasonScopedBoard({
        scope: "season",
        season: "507f1f77bcf86cd799439011",
      })
    ).toBe(true);
    expect(isSeasonScopedBoard({})).toBe(false);
  });

  test("canBypassSeasonRegistration allows admin manager creator", () => {
    const creatorId = {
      equals: (id) => id === "creator1",
      toString: () => "creator1",
    };
    const board = {
      scope: "season",
      season: "507f1f77bcf86cd799439011",
      creator: creatorId,
    };

    expect(
      canBypassSeasonRegistration(board, { auth: "admin", _id: "u1" })
    ).toBe(true);
    expect(
      canBypassSeasonRegistration(board, { auth: "manager", _id: "u1" })
    ).toBe(true);
    expect(
      canBypassSeasonRegistration(board, { auth: "member", _id: "creator1" })
    ).toBe(true);
    expect(
      canBypassSeasonRegistration(board, { auth: "member", _id: "other" })
    ).toBe(false);
  });

  test("isBoardVisibleForSeason includes school boards and matching season", () => {
    const boards = [
      { _id: "1", scope: "school" },
      { _id: "2", scope: "season", season: "seasonA" },
      { _id: "3", scope: "season", season: "seasonB" },
      { _id: "4" },
    ];
    const visible = boards.filter((b) =>
      isBoardVisibleForSeason(b, "seasonA")
    );
    expect(visible.map((b) => b._id)).toEqual(["1", "2", "4"]);
  });

  test("isBoardVisibleForSeason excludes season boards without current season", () => {
    const boards = [
      { _id: "1", scope: "school" },
      { _id: "2", scope: "season", season: "seasonA" },
    ];
    const visible = boards.filter((b) => isBoardVisibleForSeason(b, null));
    expect(visible.map((b) => b._id)).toEqual(["1"]);
  });

  test("isUserAssignedToSchool matches schoolId on user.schools", () => {
    const user = {
      schools: [{ schoolId: "byul", school: "oid1" }],
    };
    expect(isUserAssignedToSchool(user, "byul")).toBe(true);
    expect(isUserAssignedToSchool(user, "other")).toBe(false);
    expect(isUserAssignedToSchool({ schools: [] }, "byul")).toBe(false);
  });

  test("grantsSchoolAffiliationAccess for school board with teacher/student group", () => {
    const schoolBoard = {
      scope: "school",
      schoolId: "byul",
    };
    const assigned = {
      schools: [{ schoolId: "byul" }],
    };
    expect(
      grantsSchoolAffiliationAccess(schoolBoard, assigned, {
        teacher: true,
        student: false,
      })
    ).toBe(true);
    expect(
      grantsSchoolAffiliationAccess(schoolBoard, assigned, {
        teacher: false,
        student: false,
      })
    ).toBe(false);
    expect(
      grantsSchoolAffiliationAccess(
        schoolBoard,
        { schools: [{ schoolId: "other" }] },
        { teacher: true }
      )
    ).toBe(false);
  });

  test("grantsSchoolAffiliationAccess denies season boards even if school assigned", () => {
    const seasonBoard = {
      scope: "season",
      season: "s1",
      schoolId: "byul",
    };
    expect(
      grantsSchoolAffiliationAccess(
        seasonBoard,
        { schools: [{ schoolId: "byul" }] },
        { teacher: true, student: true }
      )
    ).toBe(false);
  });
});
