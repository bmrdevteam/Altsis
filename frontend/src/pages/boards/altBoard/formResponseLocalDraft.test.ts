import {
  FORM_RESPONSE_DRAFT_EXPIRE_MS,
  clearFormResponseDraft,
  formResponseDraftStorageKey,
  hasFormResponseDraftContent,
  hasLocalComposeDraft,
  persistFormResponseDraft,
  persistPreviousDraftBind,
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

  test("hasLocalComposeDraft is true only when new key has content", () => {
    expect(hasLocalComposeDraft("u1", "f1")).toBe(false);
    expect(hasLocalComposeDraft(null, "f1")).toBe(false);
    writeFormResponseDraft(key, {}, 1_000);
    expect(hasLocalComposeDraft("u1", "f1", 1_000)).toBe(false);
    writeFormResponseDraft(key, { a: "" }, 1_000);
    expect(hasLocalComposeDraft("u1", "f1", 1_000)).toBe(false);
    writeFormResponseDraft(key, { a: "진행 중" }, 1_000);
    expect(hasLocalComposeDraft("u1", "f1", 1_000)).toBe(true);
    writeFormResponseDraft(
      formResponseDraftStorageKey("u1", "f1", "row1"),
      { a: "다른 행" },
      1_000
    );
    clearFormResponseDraft(key);
    expect(hasLocalComposeDraft("u1", "f1", 1_000)).toBe(false);
  });

  test("persistPreviousDraftBind keeps the old key's last data when the key changes", () => {
    const localKey = formResponseDraftStorageKey("u1", "f1", "new");
    const rowKey = formResponseDraftStorageKey("u1", "f1", "row1");
    persistFormResponseDraft(localKey, { title: "로컬초안" });
    const wrote = persistPreviousDraftBind(
      { key: localKey, data: { title: "로컬초안" } },
      rowKey
    );
    expect(wrote).toBe(true);
    expect(readFormResponseDraft(localKey)?.data).toEqual({ title: "로컬초안" });
    persistPreviousDraftBind(
      { key: localKey, data: { title: "로컬초안" } },
      rowKey
    );
    persistFormResponseDraft(rowKey, { title: "서버초안" });
    expect(readFormResponseDraft(localKey)?.data).toEqual({ title: "로컬초안" });
    expect(readFormResponseDraft(rowKey)?.data).toEqual({ title: "서버초안" });
  });

  test("persistPreviousDraftBind does not write when the key is unchanged", () => {
    const localKey = formResponseDraftStorageKey("u1", "f1", "new");
    persistFormResponseDraft(localKey, { title: "원래" });
    expect(
      persistPreviousDraftBind(
        { key: localKey, data: { title: "덮이면 안 됨" } },
        localKey
      )
    ).toBe(false);
    expect(readFormResponseDraft(localKey)?.data).toEqual({ title: "원래" });
  });

  test("key-change flush keeps previous data even if the new screen data is already in hand", () => {
    const localKey = formResponseDraftStorageKey("u1", "f1", "new");
    const rowKey = formResponseDraftStorageKey("u1", "f1", "row1");
    let bound = { key: localKey, data: { title: "로컬초안" } };
    persistFormResponseDraft(bound.key, bound.data);

    const nextKey = rowKey;
    const nextData = { title: "서버초안" };
    if (bound.key === nextKey) {
      bound.data = nextData;
    }
    persistPreviousDraftBind(bound, nextKey);
    bound = { key: nextKey, data: nextData };

    expect(readFormResponseDraft(localKey)?.data).toEqual({ title: "로컬초안" });
    persistFormResponseDraft(bound.key, bound.data);
    expect(readFormResponseDraft(localKey)?.data).toEqual({ title: "로컬초안" });
    expect(readFormResponseDraft(rowKey)?.data).toEqual({ title: "서버초안" });
  });
});
