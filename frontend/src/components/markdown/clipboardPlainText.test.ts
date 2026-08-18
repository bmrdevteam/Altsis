import { Schema, Slice, Fragment } from "prosemirror-model";
import { serializeClipboardPlainText } from "./clipboardPlainText";

describe("serializeClipboardPlainText", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "inline*" },
      text: { group: "inline" },
    },
  });

  test("선택된 문단의 글만 남기고 태그는 넣지 않는다", () => {
    const p = schema.node("paragraph", null, [schema.text("하나님은 당신을 교사로 부르셨습니다!")]);
    const slice = new Slice(Fragment.from(p), 0, 0);
    const text = serializeClipboardPlainText(slice);
    expect(text).toBe("하나님은 당신을 교사로 부르셨습니다!");
    expect(text).not.toMatch(/<p|<strong|text-align/);
  });
});
