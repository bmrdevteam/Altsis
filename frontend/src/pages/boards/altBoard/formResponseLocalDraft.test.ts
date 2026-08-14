import {
  FORM_RESPONSE_DRAFT_EXPIRE_MS,
  clearFormResponseDraft,
  formResponseDraftStorageKey,
  hasFormResponseDraftContent,
  readFormResponseDraft,
  writeFormResponseDraft,
} from "./formResponseLocalDraft";

describe("formResponseLocalDraft", () => {
  const key = formResponseDraftStorageKey("u1", "f1", "new");

  beforeEach(() => {
    localStorage.clear();
  });

  test("writes and reads payload", () => {
    expect(formResponseDraftStorageKey("u1", "f1")).toBe(
      "alt-form-response-u1-f1-new"
    );
    writeFormResponseDraft(key, { a: "초안" }, 1_000);
    expect(readFormResponseDraft(key, 1_000)).toEqual({
      data: { a: "초안" },
      savedAt: 1_000,
    });
  });

  test("expires after 7 days", () => {
    writeFormResponseDraft(key, { a: "old" }, 1_000);
    expect(
      readFormResponseDraft(key, 1_000 + FORM_RESPONSE_DRAFT_EXPIRE_MS + 1)
    ).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  test("clearFormResponseDraft removes the key", () => {
    writeFormResponseDraft(key, { a: "x" });
    clearFormResponseDraft(key);
    expect(readFormResponseDraft(key)).toBeNull();
  });

  test("hasFormResponseDraftContent treats empty as no content", () => {
    expect(hasFormResponseDraftContent({})).toBe(false);
    expect(hasFormResponseDraftContent({ a: "" })).toBe(false);
    expect(hasFormResponseDraftContent({ a: "글" })).toBe(true);
    expect(hasFormResponseDraftContent({ a: ["f"] })).toBe(true);
  });
});
