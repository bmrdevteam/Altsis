import {
  applyOptionEnter,
  applyOptionPaste,
  splitOptionPaste,
} from "./optionListEdit";

describe("splitOptionPaste", () => {
  test("splits newline lists and drops empty lines", () => {
    expect(splitOptionPaste("축구\n농구\n\n배드민턴\n")).toEqual([
      "축구",
      "농구",
      "배드민턴",
    ]);
  });

  test("handles CRLF and trims", () => {
    expect(splitOptionPaste("  a \r\n b  ")).toEqual(["a", "b"]);
  });

  test("splits a single tab-separated row", () => {
    expect(splitOptionPaste("월\t화\t수")).toEqual(["월", "화", "수"]);
  });

  test("keeps a single plain line as one item", () => {
    expect(splitOptionPaste("축구")).toEqual(["축구"]);
  });
});

describe("applyOptionPaste", () => {
  test("replaces current option and inserts the rest after it", () => {
    const result = applyOptionPaste(["옵션 1", "옵션 2"], 0, "축구\n농구\n배구");
    expect(result).toEqual({
      options: ["축구", "농구", "배구", "옵션 2"],
      focusIndex: 2,
    });
  });

  test("returns null for a single line so default paste can run", () => {
    expect(applyOptionPaste(["옵션 1"], 0, "축구")).toBeNull();
  });
});

describe("applyOptionEnter", () => {
  test("inserts an empty option after the current one", () => {
    expect(applyOptionEnter(["축구", "농구"], 0)).toEqual({
      options: ["축구", "", "농구"],
      focusIndex: 1,
    });
  });

  test("does not add another empty row on the last blank option", () => {
    expect(applyOptionEnter(["축구", ""], 1)).toBeNull();
  });

  test("adds a blank after the last filled option", () => {
    expect(applyOptionEnter(["축구"], 0)).toEqual({
      options: ["축구", ""],
      focusIndex: 1,
    });
  });
});
