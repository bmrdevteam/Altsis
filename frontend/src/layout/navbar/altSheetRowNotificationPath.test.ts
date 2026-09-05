import { altSheetRowNotificationPath } from "./altSheetRowNotificationPath";

describe("altSheetRowNotificationPath", () => {
  test("uses sheet and row when formId is present", () => {
    expect(
      altSheetRowNotificationPath({
        boardId: "board1",
        formId: "form1",
        rowId: "row1",
      })
    ).toBe("/boards/board1?sheet=form1&row=row1#활동");
  });

  test("falls back to approval when formId is missing", () => {
    expect(
      altSheetRowNotificationPath({
        boardId: "board1",
        rowId: "row1",
      })
    ).toBe("/boards/board1?approval=row1#활동");
    expect(
      altSheetRowNotificationPath({
        boardId: "board1",
        formId: "  ",
        rowId: "row1",
      })
    ).toBe("/boards/board1?approval=row1#활동");
    expect(
      altSheetRowNotificationPath({
        boardId: "board1",
        formId: null,
        rowId: "row1",
      })
    ).toBe("/boards/board1?approval=row1#활동");
  });

  test("encodes ids and keeps the activity hash", () => {
    const path = altSheetRowNotificationPath({
      boardId: "b/1",
      formId: "f&2",
      rowId: "r 3",
    });
    expect(path).toBe(
      `/boards/${encodeURIComponent("b/1")}?sheet=${encodeURIComponent(
        "f&2"
      )}&row=${encodeURIComponent("r 3")}#활동`
    );
    expect(path.endsWith("#활동")).toBe(true);
  });
});
