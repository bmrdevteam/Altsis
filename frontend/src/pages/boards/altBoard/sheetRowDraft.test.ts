import { TAltSheetRow } from "types/altSheet";
import {
  buildInProgressDraftList,
  canCreateAdditionalDraft,
  canSubmitReviewDraft,
  isDraftSheetRow,
  remainingDraftSlots,
  sortDraftRows,
  sortMyRowsForReview,
  sortSubmittedRows,
  splitMyRows,
} from "./sheetRowDraft";

const row = (
  id: string,
  extra: Partial<TAltSheetRow> = {}
): TAltSheetRow =>
  ({
    _id: id,
    sheet: "s",
    form: "f",
    board: "b",
    data: {},
    _submittedAt: extra._submittedAt || "",
    _updatedAt: extra._updatedAt || "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
    ...extra,
  }) as TAltSheetRow;

describe("splitMyRows / isDraftSheetRow", () => {
  test("legacy rows without isDraft are submitted", () => {
    expect(isDraftSheetRow(row("a"))).toBe(false);
    const { draftRows, submittedRows } = splitMyRows([
      row("s1"),
      row("d1", { isDraft: true }),
      row("s2", { isDraft: false }),
    ]);
    expect(draftRows.map((r) => r._id)).toEqual(["d1"]);
    expect(submittedRows.map((r) => r._id)).toEqual(["s1", "s2"]);
  });
});

describe("sortDraftRows / sortSubmittedRows", () => {
  const mixed = [
    row("sOld", { _submittedAt: "2026-01-01T00:00:00.000Z" }),
    row("dOld", {
      isDraft: true,
      _updatedAt: "2026-02-01T00:00:00.000Z",
    }),
    row("sNew", { _submittedAt: "2026-03-01T00:00:00.000Z" }),
    row("dNew", {
      isDraft: true,
      _updatedAt: "2026-04-01T00:00:00.000Z",
    }),
  ];

  test("sorts drafts by updatedAt only", () => {
    expect(sortDraftRows(mixed).map((r) => r._id)).toEqual(["dNew", "dOld"]);
  });

  test("sorts submitted by submittedAt only", () => {
    expect(sortSubmittedRows(mixed).map((r) => r._id)).toEqual([
      "sNew",
      "sOld",
    ]);
  });

  test("sortMyRowsForReview still concatenates drafts then submitted", () => {
    expect(sortMyRowsForReview(mixed).map((r) => r._id)).toEqual([
      "dNew",
      "dOld",
      "sNew",
      "sOld",
    ]);
  });
});

describe("buildInProgressDraftList", () => {
  const drafts = [
    row("dOld", {
      isDraft: true,
      _updatedAt: "2026-02-01T00:00:00.000Z",
    }),
    row("dNew", {
      isDraft: true,
      _updatedAt: "2026-04-01T00:00:00.000Z",
    }),
  ];

  test("always puts the local or blank slot first", () => {
    expect(buildInProgressDraftList(drafts)).toEqual([
      { kind: "local" },
      { kind: "row", row: drafts[1] },
      { kind: "row", row: drafts[0] },
    ]);
  });

  test("is only the local slot when there are no server drafts", () => {
    expect(buildInProgressDraftList([])).toEqual([{ kind: "local" }]);
    expect(buildInProgressDraftList(undefined)).toEqual([{ kind: "local" }]);
  });
});

describe("remainingDraftSlots / canCreateAdditionalDraft", () => {
  const multiRequired = {
    settings: {
      allowMultipleResponses: true,
      requiredMode: true,
      requiredResponseCount: 3,
    },
  } as any;

  test("caps submitted + drafts at target N", () => {
    expect(remainingDraftSlots(multiRequired, 1, 1)).toBe(1);
    expect(remainingDraftSlots(multiRequired, 2, 1)).toBe(0);
    expect(canCreateAdditionalDraft(multiRequired, 2, 1)).toBe(false);
    expect(canCreateAdditionalDraft(multiRequired, 1, 1)).toBe(true);
  });

  test("unlimited multiple has no slot cap", () => {
    const form = {
      settings: { allowMultipleResponses: true, requiredMode: false },
    } as any;
    expect(remainingDraftSlots(form, 5, 2)).toBeNull();
    expect(canCreateAdditionalDraft(form, 5, 2)).toBe(true);
  });

  test("single form allows a draft only when empty", () => {
    const form = { settings: { allowMultipleResponses: false } } as any;
    expect(canCreateAdditionalDraft(form, 0, 0)).toBe(true);
    expect(canCreateAdditionalDraft(form, 0, 1)).toBe(false);
    expect(canCreateAdditionalDraft(form, 1, 0)).toBe(false);
  });
});

describe("canSubmitReviewDraft", () => {
  test("allows a saved draft when submit is open", () => {
    expect(
      canSubmitReviewDraft(row("d1", { isDraft: true }), { canSubmit: true })
    ).toBe(true);
  });

  test("rejects submitted rows, closed window, and quota", () => {
    expect(
      canSubmitReviewDraft(row("s1"), { canSubmit: true })
    ).toBe(false);
    expect(
      canSubmitReviewDraft(row("d1", { isDraft: true }), { canSubmit: false })
    ).toBe(false);
    expect(
      canSubmitReviewDraft(row("d1", { isDraft: true }), {
        canSubmit: true,
        allowMultipleResponses: true,
        quotaReached: true,
      })
    ).toBe(false);
  });
});
