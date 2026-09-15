import {
  clampLineHeight,
  formatLineHeight,
  parseLineHeight,
} from "./blockLineHeight";

describe("clampLineHeight", () => {
  test("keeps values in 1–3", () => {
    expect(clampLineHeight(1)).toBe(1);
    expect(clampLineHeight(1.45)).toBe(1.45);
    expect(clampLineHeight(3)).toBe(3);
  });

  test("rejects empty and out of range", () => {
    expect(clampLineHeight(null)).toBeNull();
    expect(clampLineHeight("")).toBeNull();
    expect(clampLineHeight(0.5)).toBeNull();
    expect(clampLineHeight(3.1)).toBeNull();
    expect(clampLineHeight("abc")).toBeNull();
  });
});

describe("parseLineHeight / formatLineHeight", () => {
  test("reads unitless CSS", () => {
    expect(parseLineHeight("1.45")).toBe(1.45);
    expect(parseLineHeight("2")).toBe(2);
    expect(parseLineHeight(" 1.8 ")).toBe(1.8);
  });

  test("drops units and empty", () => {
    expect(parseLineHeight("1.45em")).toBeNull();
    expect(parseLineHeight("20px")).toBeNull();
    expect(parseLineHeight("")).toBeNull();
  });

  test("formats stored numbers for style", () => {
    expect(formatLineHeight(1.45)).toBe("1.45");
    expect(formatLineHeight(2)).toBe("2");
    expect(formatLineHeight(null)).toBeNull();
  });
});
