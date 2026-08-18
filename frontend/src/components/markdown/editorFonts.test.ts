import {
  canonicalFontFamily,
  clampFontSizePx,
  parseFontSizePx,
  textStyleMarkTags,
} from "./editorFonts";

describe("editorFonts", () => {
  test("parseFontSizePx accepts 8–72px", () => {
    expect(parseFontSizePx("18px")).toBe(18);
    expect(parseFontSizePx("18")).toBe(18);
    expect(parseFontSizePx("7px")).toBeNull();
    expect(parseFontSizePx("73px")).toBeNull();
    expect(clampFontSizePx(14)).toBe(14);
  });

  test("canonicalFontFamily maps Noto Serif KR variants", () => {
    expect(canonicalFontFamily(`"Noto Serif KR", serif`)).toBe(
      "'Noto Serif KR', serif"
    );
    expect(canonicalFontFamily("Comic Sans MS")).toBeNull();
    expect(canonicalFontFamily(null)).toBeNull();
  });

  test("textStyleMarkTags builds span HTML", () => {
    expect(
      textStyleMarkTags({
        fontSize: "18px",
        fontFamily: "'Noto Serif KR', serif",
        color: "#111",
      })
    ).toEqual({
      open: `<span style="color: #111; font-size: 18px; font-family: 'Noto Serif KR', serif">`,
      close: "</span>",
    });
    expect(textStyleMarkTags({})).toBeNull();
  });
});
