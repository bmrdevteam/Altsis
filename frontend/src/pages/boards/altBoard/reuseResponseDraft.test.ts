import { copyRowDataForReuse } from "./reuseResponseDraft";

const fields = [
  { _id: "text1", type: "text" as const },
  { _id: "file1", type: "file" as const },
  { _id: "appr1", type: "approval" as const },
];

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

  test("returns empty object for nullish data", () => {
    expect(copyRowDataForReuse(null, fields)).toEqual({});
    expect(copyRowDataForReuse(undefined, fields)).toEqual({});
  });
});
