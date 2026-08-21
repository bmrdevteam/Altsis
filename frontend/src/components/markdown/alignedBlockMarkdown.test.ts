import { Schema } from "prosemirror-model";
import {
  alignedInlineHtml,
  hasNonDefaultTextAlign,
  serializeAlignedBlock,
  wrapAlignedBlockHtml,
} from "./alignedBlockMarkdown";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: { textAlign: { default: "left" } },
    },
    heading: {
      group: "block",
      content: "inline*",
      attrs: {
        level: { default: 1 },
        textAlign: { default: "left" },
      },
    },
    text: { group: "inline" },
  },
  marks: {
    bold: {
      toDOM: () => ["strong", 0],
      parseDOM: [{ tag: "strong" }],
    },
    italic: {
      toDOM: () => ["em", 0],
      parseDOM: [{ tag: "em" }],
    },
  },
});

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

describe("wrapAlignedBlockHtml", () => {
  test("문단·제목 태그와 정렬 스타일을 붙인다", () => {
    expect(wrapAlignedBlockHtml("paragraph", "center", "본문")).toBe(
      '<p style="text-align: center">본문</p>'
    );
    expect(wrapAlignedBlockHtml("heading", "right", "본문", 2)).toBe(
      '<h2 style="text-align: right">본문</h2>'
    );
  });

  test("제목 레벨은 1–6만 쓴다", () => {
    expect(wrapAlignedBlockHtml("heading", "center", "본문", 0)).toBe(
      '<h1 style="text-align: center">본문</h1>'
    );
    expect(wrapAlignedBlockHtml("heading", "center", "본문", 9)).toBe(
      '<h1 style="text-align: center">본문</h1>'
    );
  });

  test("허용되지 않은 정렬 값은 태그를 붙이지 않는다", () => {
    expect(wrapAlignedBlockHtml("paragraph", "left", "본문")).toBe("본문");
    expect(wrapAlignedBlockHtml("paragraph", `center" onload="x`, "본문")).toBe(
      "본문"
    );
  });
});

describe("alignedInlineHtml", () => {
  test("굵게 마크는 ** 가 아니라 strong 태그가 된다", () => {
    const para = schema.node("paragraph", { textAlign: "center" }, [
      schema.text("분노 일지 작성하기", [schema.marks.bold.create()]),
    ]);
    expect(alignedInlineHtml(para)).toBe(
      "<strong>분노 일지 작성하기</strong>"
    );
  });

  test("스키마가 없으면 빈 문자열이다", () => {
    expect(alignedInlineHtml({ attrs: { textAlign: "center" } })).toBe("");
  });

  test("텍스트의 < 는 이스케이프한다", () => {
    const para = schema.node("paragraph", { textAlign: "center" }, [
      schema.text("<script>"),
    ]);
    expect(alignedInlineHtml(para)).toBe("&lt;script&gt;");
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

  test("가운데 문단의 굵게는 strong HTML이지 ** 가 아니다", () => {
    const { state, get } = capture();
    const para = schema.node("paragraph", { textAlign: "center" }, [
      schema.text("분노 일지 작성하기", [schema.marks.bold.create()]),
    ]);
    serializeAlignedBlock(state, para, "paragraph");
    const out = get();
    expect(out).toBe(
      '<p style="text-align: center"><strong>분노 일지 작성하기</strong></p>\n'
    );
    expect(out).not.toContain("**");
  });

  test("가운데 제목의 기울임은 em HTML이다", () => {
    const { state, get } = capture();
    const heading = schema.node(
      "heading",
      { textAlign: "center", level: 2 },
      [schema.text("본문", [schema.marks.italic.create()])]
    );
    serializeAlignedBlock(state, heading, "heading");
    const out = get();
    expect(out).toBe('<h2 style="text-align: center"><em>본문</em></h2>\n');
    expect(out).not.toContain("*본문*");
  });

  test("빈 가운데 문단도 HTML p로 저장한다", () => {
    const { state, get } = capture();
    const para = schema.node("paragraph", { textAlign: "center" });
    serializeAlignedBlock(state, para, "paragraph");
    expect(get()).toBe('<p style="text-align: center"></p>\n');
  });

  test("기본 문단은 마크다운만 쓴다", () => {
    const { state, get } = capture();
    serializeAlignedBlock(state, { attrs: {} }, "paragraph");
    expect(get()).toBe("본문\n");
  });

  test("기본 제목은 ATX 마크다운이다", () => {
    const { state, get } = capture();
    serializeAlignedBlock(state, { attrs: { level: 1 } }, "heading");
    expect(get()).toBe("# 본문\n");
  });
});
