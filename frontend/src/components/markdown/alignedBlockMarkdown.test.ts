import {
  hasNonDefaultTextAlign,
  serializeAlignedBlock,
} from "./alignedBlockMarkdown";

describe("hasNonDefaultTextAlign", () => {
  test("center/right/justify만 비기본으로 본다", () => {
    expect(hasNonDefaultTextAlign("center")).toBe(true);
    expect(hasNonDefaultTextAlign("right")).toBe(true);
    expect(hasNonDefaultTextAlign("justify")).toBe(true);
    expect(hasNonDefaultTextAlign("left")).toBe(false);
    expect(hasNonDefaultTextAlign(null)).toBe(false);
    expect(hasNonDefaultTextAlign("")).toBe(false);
  });
});

describe("serializeAlignedBlock", () => {
  const capture = () => {
    let out = "";
    const state = {
      write: (t: string) => {
        out += t;
      },
      renderInline: () => {
        out += "본문";
      },
      closeBlock: () => {
        out += "\n";
      },
    };
    return { state, get: () => out };
  };

  test("가운데 문단은 HTML p로 저장한다", () => {
    const { state, get } = capture();
    serializeAlignedBlock(
      state,
      { attrs: { textAlign: "center" } },
      "paragraph"
    );
    expect(get()).toBe('<p style="text-align: center">본문</p>\n');
  });

  test("기본 문단은 마크다운만 쓴다", () => {
    const { state, get } = capture();
    serializeAlignedBlock(state, { attrs: {} }, "paragraph");
    expect(get()).toBe("본문\n");
  });

  test("가운데 제목은 HTML hn으로 저장한다", () => {
    const { state, get } = capture();
    serializeAlignedBlock(
      state,
      { attrs: { textAlign: "center", level: 2 } },
      "heading"
    );
    expect(get()).toBe('<h2 style="text-align: center">본문</h2>\n');
  });

  test("기본 제목은 ATX 마크다운이다", () => {
    const { state, get } = capture();
    serializeAlignedBlock(state, { attrs: { level: 1 } }, "heading");
    expect(get()).toBe("# 본문\n");
  });
});
