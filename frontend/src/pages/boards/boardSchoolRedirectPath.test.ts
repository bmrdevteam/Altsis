import { boardSchoolRedirectPath } from "./boardSchoolRedirectPath";

describe("boardSchoolRedirectPath", () => {
  test("redirects to the board school and keeps search/hash", () => {
    expect(
      boardSchoolRedirectPath({
        academyId: "bmr",
        urlSchoolId: "bmrhs",
        boardSchoolId: "bmrworkspace",
        boardId: "board1",
        search: "?sheet=form1&row=row1",
        hash: "#활동",
      })
    ).toBe(
      "/bmr/bmrworkspace/boards/board1?sheet=form1&row=row1#활동"
    );
  });

  test("returns null when URL school already matches", () => {
    expect(
      boardSchoolRedirectPath({
        academyId: "bmr",
        urlSchoolId: "bmrworkspace",
        boardSchoolId: "bmrworkspace",
        boardId: "board1",
      })
    ).toBeNull();
  });

  test("returns null when required ids are missing", () => {
    expect(
      boardSchoolRedirectPath({
        academyId: "bmr",
        urlSchoolId: "bmrhs",
        boardSchoolId: "",
        boardId: "board1",
      })
    ).toBeNull();
  });
});
