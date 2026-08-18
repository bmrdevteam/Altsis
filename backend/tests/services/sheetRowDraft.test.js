import {
  collectRespondentFieldData,
  checkDraftSaveLimit,
  canOwnerDeleteDraft,
  needsAllowResubmitToEdit,
} from "../../src/services/sheetRowDraft.js";
import { hasSubmittedForList } from "../../src/services/altForms.js";
import { splitSheetRows } from "../../src/utils/sheetRowQuery.js";

const field = (id, extra = {}) => ({
  _id: { toString: () => id },
  permission: "respondent",
  type: "text",
  label: id,
  ...extra,
});

describe("collectRespondentFieldData", () => {
  test("keeps respondent values and skips content fields", () => {
    const form = {
      fields: [
        field("a"),
        field("c", { type: "content" }),
        field("own", { permission: "owner" }),
      ],
    };
    const { data } = collectRespondentFieldData(form, { a: "초안", c: "x" });
    expect(data).toEqual({ a: "초안" });
  });

  test("allows empty required values (no submit validation)", () => {
    const form = { fields: [field("a", { required: true })] };
    const { data } = collectRespondentFieldData(form, { a: "" });
    expect(data.a).toBe("");
  });
});

describe("checkDraftSaveLimit", () => {
  test("updating an existing draft is always allowed", () => {
    const form = {
      settings: { allowMultipleResponses: true, requiredMode: true, requiredResponseCount: 1 },
    };
    expect(
      checkDraftSaveLimit(form, [{ _id: "s" }], [{ _id: "d", isDraft: true }], {
        updatingDraftId: "d",
      }).allowed
    ).toBe(true);
  });

  test("single form: existing submitted blocks a new draft", () => {
    const form = { settings: { allowMultipleResponses: false } };
    const result = checkDraftSaveLimit(form, [{ _id: "s" }], []);
    expect(result.allowed).toBe(false);
  });

  test("single form: existing draft is upserted", () => {
    const form = { settings: { allowMultipleResponses: false } };
    const draft = { _id: "d", isDraft: true };
    const result = checkDraftSaveLimit(form, [], [draft]);
    expect(result.allowed).toBe(true);
    expect(result.existingDraft).toBe(draft);
  });

  test("multiple required: submitted + drafts cannot exceed target", () => {
    const form = {
      settings: {
        allowMultipleResponses: true,
        requiredMode: true,
        requiredResponseCount: 2,
      },
    };
    expect(checkDraftSaveLimit(form, [{ _id: "s" }], [{ _id: "d", isDraft: true }]).allowed).toBe(
      false
    );
    expect(checkDraftSaveLimit(form, [{ _id: "s" }], []).allowed).toBe(true);
  });

  test("direct input is rejected", () => {
    const form = { settings: { directInputMode: true } };
    expect(checkDraftSaveLimit(form, [], []).allowed).toBe(false);
  });
});

describe("draft vs submitted list counts", () => {
  test("hasSubmittedForList uses split submitted rows only", () => {
    const form = { settings: { allowMultipleResponses: false } };
    const { submittedRows } = splitSheetRows([
      { _id: "d", isDraft: true },
      { _id: "s" },
    ]);
    expect(hasSubmittedForList(form, submittedRows)).toBe(true);
    expect(hasSubmittedForList(form, [])).toBe(false);
  });

  test("draft-only rows are not submitted for list badge", () => {
    const form = { settings: { allowMultipleResponses: false } };
    const { draftRows, submittedRows } = splitSheetRows([
      { _id: "d", isDraft: true },
    ]);
    expect(draftRows).toHaveLength(1);
    expect(submittedRows).toHaveLength(0);
    expect(hasSubmittedForList(form, submittedRows)).toBe(false);
  });
});

describe("canOwnerDeleteDraft / needsAllowResubmitToEdit", () => {
  test("owner can delete own draft without allowResubmit", () => {
    expect(
      canOwnerDeleteDraft({ isDraft: true, _respondent: "u1" }, "u1")
    ).toBe(true);
    expect(
      canOwnerDeleteDraft({ isDraft: false, _respondent: "u1" }, "u1")
    ).toBe(false);
  });

  test("promoting a draft does not need allowResubmit", () => {
    expect(needsAllowResubmitToEdit({ isDraft: true })).toBe(false);
    expect(needsAllowResubmitToEdit({ isDraft: false })).toBe(true);
    expect(needsAllowResubmitToEdit({ _id: "legacy" })).toBe(true);
  });
});
