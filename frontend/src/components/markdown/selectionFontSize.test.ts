import type { Node as PMNode } from "prosemirror-model";
import { Schema } from "prosemirror-model";
import { EditorState, NodeSelection, TextSelection } from "prosemirror-state";
import {
  displayedFontSizePx,
  formatToolbarFontSize,
  resolveSelectionFontSize,
} from "./selectionFontSize";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
    },
    codeBlock: { group: "block", content: "text*", marks: "" },
    bulletList: { group: "block", content: "listItem+" },
    listItem: { content: "paragraph block*" },
    image: { group: "block", atom: true },
    text: { group: "inline" },
  },
  marks: {
    textStyle: {
      attrs: { fontSize: { default: null } },
    },
    code: {},
  },
});

const text = (value: string, fontSize?: string, code = false) => {
  const marks = [];
  if (fontSize) marks.push(schema.mark("textStyle", { fontSize }));
  if (code) marks.push(schema.mark("code"));
  return schema.text(value, marks);
};

const cursorIn = (doc: PMNode, value: string, offset = 0) => {
  let at = -1;
  doc.descendants((node, pos) => {
    if (at >= 0) return false;
    if (node.isText && node.text === value) {
      at = pos + offset;
      return false;
    }
    return undefined;
  });
  if (at < 0) throw new Error(`missing text ${value}`);
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, at),
  });
};

const rangeOf = (doc: PMNode, fromText: string, toText: string) => {
  const from = cursorIn(doc, fromText).selection.from;
  let to = -1;
  doc.descendants((node, pos) => {
    if (to >= 0) return false;
    if (node.isText && node.text === toText) {
      to = pos + node.text.length;
      return false;
    }
    return undefined;
  });
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, from, to),
  });
};

describe("displayedFontSizePx", () => {
  test("uses body 14px and heading em from the editor stylesheet", () => {
    const plain = {
      explicitPx: null,
      headingLevel: null,
      inlineCode: false,
      codeBlock: false,
    };
    expect(displayedFontSizePx(plain)).toBe(14);
    expect(displayedFontSizePx({ ...plain, headingLevel: 1 })).toBe(28);
    expect(displayedFontSizePx({ ...plain, headingLevel: 2 })).toBe(21);
    expect(displayedFontSizePx({ ...plain, headingLevel: 3 })).toBe(17.5);
    expect(displayedFontSizePx({ ...plain, headingLevel: 4 })).toBe(15.75);
    expect(displayedFontSizePx({ ...plain, headingLevel: 5 })).toBe(14);
    expect(displayedFontSizePx({ ...plain, headingLevel: 6 })).toBe(12.25);
  });

  test("applies code 85% and keeps an explicit size absolute", () => {
    expect(
      displayedFontSizePx({
        explicitPx: null,
        headingLevel: null,
        inlineCode: true,
        codeBlock: false,
      })
    ).toBe(11.9);
    expect(
      displayedFontSizePx({
        explicitPx: null,
        headingLevel: 2,
        inlineCode: true,
        codeBlock: false,
      })
    ).toBe(17.85);
    expect(
      displayedFontSizePx({
        explicitPx: null,
        headingLevel: null,
        inlineCode: false,
        codeBlock: true,
      })
    ).toBe(10.12);
    expect(
      displayedFontSizePx({
        explicitPx: 20,
        headingLevel: 1,
        inlineCode: true,
        codeBlock: false,
      })
    ).toBe(20);
  });

  test("formats the toolbar label without trailing zeros", () => {
    expect(formatToolbarFontSize(14)).toBe("14");
    expect(formatToolbarFontSize(17.5)).toBe("17.5");
    expect(formatToolbarFontSize(15.75)).toBe("15.75");
  });
});

describe("resolveSelectionFontSize", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [text("크기", "18px"), text("본문")]),
    schema.node("heading", { level: 1 }, [text("제목")]),
    schema.node("heading", { level: 4 }, []),
    schema.node("codeBlock", null, [schema.text("코드")]),
    schema.node("paragraph", null, [text("인라인", undefined, true)]),
    schema.node("paragraph", null, [text("지정", "20px", true)]),
    schema.node("bulletList", null, [
      schema.node("listItem", null, [
        schema.node("paragraph", null, [text("항목")]),
      ]),
    ]),
  ]);

  test("reads the size at the cursor", () => {
    expect(resolveSelectionFontSize(cursorIn(doc, "크기"))).toEqual({
      status: "uniform",
      px: 18,
      explicit: true,
    });
    expect(resolveSelectionFontSize(cursorIn(doc, "본문", 1))).toEqual({
      status: "uniform",
      px: 14,
      explicit: false,
    });
    // 글자 크기 마크는 끝에서도 켜져 있어, 본문 바로 앞 커서는 앞 글자 크기다.
    expect(resolveSelectionFontSize(cursorIn(doc, "본문"))).toEqual({
      status: "uniform",
      px: 18,
      explicit: true,
    });
    expect(resolveSelectionFontSize(cursorIn(doc, "제목"))).toEqual({
      status: "uniform",
      px: 28,
      explicit: false,
    });
    expect(resolveSelectionFontSize(cursorIn(doc, "코드"))).toEqual({
      status: "uniform",
      px: 10.12,
      explicit: false,
    });
    expect(resolveSelectionFontSize(cursorIn(doc, "인라인"))).toEqual({
      status: "uniform",
      px: 11.9,
      explicit: false,
    });
    expect(resolveSelectionFontSize(cursorIn(doc, "지정"))).toEqual({
      status: "uniform",
      px: 20,
      explicit: true,
    });
    expect(resolveSelectionFontSize(cursorIn(doc, "항목"))).toEqual({
      status: "uniform",
      px: 14,
      explicit: false,
    });
  });

  test("reads an empty heading from the block style", () => {
    let inside = -1;
    doc.descendants((node, pos) => {
      if (inside >= 0) return false;
      if (node.type.name === "heading" && node.content.size === 0) {
        inside = pos + 1;
        return false;
      }
      return undefined;
    });
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, inside),
    });
    expect(resolveSelectionFontSize(state)).toEqual({
      status: "uniform",
      px: 15.75,
      explicit: false,
    });
  });

  test("uses stored marks for the size about to be typed", () => {
    const base = cursorIn(doc, "본문");
    const next = base.apply(
      base.tr.setStoredMarks([schema.mark("textStyle", { fontSize: "20px" })])
    );
    expect(resolveSelectionFontSize(next)).toEqual({
      status: "uniform",
      px: 20,
      explicit: true,
    });
  });

  test("returns mixed when the selection covers more than one size", () => {
    expect(resolveSelectionFontSize(rangeOf(doc, "크기", "본문"))).toEqual({
      status: "mixed",
    });
  });

  test("treats a heading and the same explicit px as one size", () => {
    const same = schema.node("doc", null, [
      schema.node("heading", { level: 1 }, [text("제목")]),
      schema.node("paragraph", null, [text("같음", "28px")]),
    ]);
    expect(resolveSelectionFontSize(rangeOf(same, "제목", "같음"))).toEqual({
      status: "uniform",
      px: 28,
      explicit: false,
    });
  });

  test("returns none when the selection is not text", () => {
    const imageDoc = schema.node("doc", null, [schema.node("image")]);
    expect(
      resolveSelectionFontSize(
        EditorState.create({
          doc: imageDoc,
          selection: NodeSelection.create(imageDoc, 0),
        })
      )
    ).toEqual({ status: "none" });
  });
});
