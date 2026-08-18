import { Schema } from "prosemirror-model";
import { EditorState, NodeSelection } from "prosemirror-state";
import { handleAtomNodeClick, selectAtomAtPos } from "./atomNodeClick";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
    image: {
      group: "inline",
      inline: true,
      atom: true,
      selectable: true,
      draggable: true,
      attrs: { src: { default: "" } },
      toDOM: (node) => ["img", { src: node.attrs.src }],
      parseDOM: [{ tag: "img[src]" }],
    },
  },
});

const createDocWithImage = () => {
  const image = schema.nodes.image.create({ src: "https://example.com/a.png" });
  const paragraph = schema.nodes.paragraph.create(null, [image]);
  return schema.node("doc", null, [paragraph]);
};

const imagePos = (state: EditorState): number => {
  let found = -1;
  state.doc.descendants((node, pos) => {
    if (node.type.name === "image") {
      found = pos;
      return false;
    }
  });
  if (found < 0) throw new Error("image not found");
  return found;
};

describe("atomNodeClick", () => {
  test("이미지 위치에서 현재 문서 기준 NodeSelection을 만든다", () => {
    const state = EditorState.create({ schema, doc: createDocWithImage() });
    const pos = imagePos(state);
    const tr = selectAtomAtPos(state, pos);
    expect(tr).not.toBeNull();
    const next = state.apply(tr!);
    expect(next.selection).toBeInstanceOf(NodeSelection);
    expect((next.selection as NodeSelection).node.type.name).toBe("image");
    expect(next.selection.$from.doc).toBe(next.doc);
  });

  test("이미지가 아니면 처리하지 않는다", () => {
    const state = EditorState.create({ schema, doc: createDocWithImage() });
    expect(selectAtomAtPos(state, 0)).toBeNull();
    expect(handleAtomNodeClick({ state, dispatch: () => undefined }, 0)).toBe(
      false
    );
  });

  test("handleAtomNodeClick이 NodeSelection을 dispatch한다", () => {
    const state = EditorState.create({ schema, doc: createDocWithImage() });
    const pos = imagePos(state);
    let next = state;
    expect(
      handleAtomNodeClick(
        {
          state,
          dispatch: (tr) => {
            next = state.apply(tr);
          },
        },
        pos
      )
    ).toBe(true);
    expect(next.selection).toBeInstanceOf(NodeSelection);
  });

  test("옛 NodeSelection을 새 문서에 넣으면 RangeError가 난다", () => {
    const state = EditorState.create({ schema, doc: createDocWithImage() });
    const pos = imagePos(state);
    const stale = NodeSelection.create(state.doc, pos);
    const grown = state.apply(
      state.tr.insert(0, schema.nodes.paragraph.createAndFill()!)
    );
    expect(() => {
      grown.tr.setSelection(stale);
    }).toThrow(/must point at the current document/);
  });
});
