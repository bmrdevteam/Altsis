import {
  submittedSheetRowFilter,
  isDraftSheetRow,
  isSubmittedSheetRow,
  splitSheetRows,
} from "../../src/utils/sheetRowQuery.js";

describe("sheetRowQuery", () => {
  test("submittedSheetRowFilter excludes isDraft true, keeps missing field", () => {
    const filter = submittedSheetRowFilter();
    expect(filter).toEqual({ isActive: true, isDraft: { $ne: true } });
  });

  test("legacy rows without isDraft count as submitted", () => {
    expect(isDraftSheetRow({ _id: "a" })).toBe(false);
    expect(isSubmittedSheetRow({ _id: "a" })).toBe(true);
    expect(isDraftSheetRow({ isDraft: false })).toBe(false);
    expect(isSubmittedSheetRow({ isDraft: false })).toBe(true);
  });

  test("isDraft true is a draft, not submitted", () => {
    expect(isDraftSheetRow({ isDraft: true })).toBe(true);
    expect(isSubmittedSheetRow({ isDraft: true })).toBe(false);
  });

  test("splitSheetRows separates draft and submitted", () => {
    const { draftRows, submittedRows } = splitSheetRows([
      { _id: "s1" },
      { _id: "d1", isDraft: true },
      { _id: "s2", isDraft: false },
    ]);
    expect(draftRows.map((r) => r._id)).toEqual(["d1"]);
    expect(submittedRows.map((r) => r._id)).toEqual(["s1", "s2"]);
  });
});
