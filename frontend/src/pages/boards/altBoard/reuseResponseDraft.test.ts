import {
  copyRowDataForReuse,
  mergeRowDataForEdit,
  shouldApplyExternalViewMode,
} from "./reuseResponseDraft";

const fields = [
  { _id: "text1", type: "text" as const },
  { _id: "file1", type: "file" as const },
  { _id: "appr1", type: "approval" as const },
  { _id: "chat1", type: "aiChat" as const },
];

describe("shouldApplyExternalViewMode", () => {
  test("keeps skip and does not apply when URL arrives first during internal edit", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: true,
        internalMode: "review",
        externalMode: "compose",
      })
    ).toEqual({ apply: false, nextSkip: true });
  });

  test("clears skip without applying once internal and URL modes match", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: true,
        internalMode: "compose",
        externalMode: "compose",
      })
    ).toEqual({ apply: false, nextSkip: false });
  });

  test("applies URL mode when skip is off (back / deep link)", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: false,
        internalMode: "review",
        externalMode: "compose",
      })
    ).toEqual({ apply: true, nextSkip: false });
  });

  test("does not apply when skip is off and modes already match", () => {
    expect(
      shouldApplyExternalViewMode({
        skipInternal: false,
        internalMode: "review",
        externalMode: "review",
      })
    ).toEqual({ apply: false, nextSkip: false });
  });
});

describe("mergeRowDataForEdit", () => {
  test("keeps fallback when row data is empty", () => {
    expect(
      mergeRowDataForEdit({}, { text1: "조회 중 본문", file1: ["a"] })
    ).toEqual({ text1: "조회 중 본문", file1: ["a"] });
  });

  test("keeps fallback when row data is nullish", () => {
    expect(mergeRowDataForEdit(null, { text1: "본문" })).toEqual({
      text1: "본문",
    });
    expect(mergeRowDataForEdit(undefined, { text1: "본문" })).toEqual({
      text1: "본문",
    });
  });

  test("row fields override fallback", () => {
    expect(
      mergeRowDataForEdit(
        { text1: "저장본", extra: 1 },
        { text1: "조회 중 본문", file1: ["a"] }
      )
    ).toEqual({ text1: "저장본", extra: 1, file1: ["a"] });
  });
});

describe("copyRowDataForReuse", () => {
  test("keeps text and file answers", () => {
    const files = [{ key: "a.pdf", originalName: "a.pdf" }];
    expect(
      copyRowDataForReuse(
        { text1: "지난 활동 요약", file1: files },
        fields
      )
    ).toEqual({ text1: "지난 활동 요약", file1: files });
  });

  test("drops underscore system keys", () => {
    expect(
      copyRowDataForReuse(
        {
          text1: "본문",
          _quiz_score: 8,
          _quiz_total: 10,
          _assessment: { status: "finalized" },
        },
        fields
      )
    ).toEqual({ text1: "본문" });
  });

  test("drops approval field values", () => {
    expect(
      copyRowDataForReuse(
        {
          text1: "본문",
          appr1: { status: "approved", steps: [] },
        },
        fields
      )
    ).toEqual({ text1: "본문" });
  });

  test("drops aiChat session summaries", () => {
    expect(
      copyRowDataForReuse(
        {
          text1: "본문",
          chat1: { sessionId: "s1", studentMessageCount: 2, messageCount: 4 },
        },
        fields
      )
    ).toEqual({ text1: "본문" });
  });

  test("returns empty object for nullish data", () => {
    expect(copyRowDataForReuse(null, fields)).toEqual({});
    expect(copyRowDataForReuse(undefined, fields)).toEqual({});
  });
});
