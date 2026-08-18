export const hasNonDefaultTextAlign = (align: unknown): align is string =>
  typeof align === "string" &&
  (align === "center" || align === "right" || align === "justify");

type MdState = {
  write: (text: string) => void;
  renderInline: (node: unknown) => void;
  closeBlock: (node: unknown) => void;
};

type AlignableNode = {
  attrs: { textAlign?: string | null; level?: number };
};

/** 가운데/오른쪽/양쪽 정렬이면 HTML로, 아니면 기본 마크다운으로 직렬화 */
export const serializeAlignedBlock = (
  state: MdState,
  node: AlignableNode,
  kind: "paragraph" | "heading"
): void => {
  const align = node.attrs.textAlign;
  if (hasNonDefaultTextAlign(align)) {
    if (kind === "heading") {
      const level = node.attrs.level || 1;
      state.write(`<h${level} style="text-align: ${align}">`);
      state.renderInline(node);
      state.write(`</h${level}>`);
    } else {
      state.write(`<p style="text-align: ${align}">`);
      state.renderInline(node);
      state.write("</p>");
    }
    state.closeBlock(node);
    return;
  }
  if (kind === "heading") {
    const level = node.attrs.level || 1;
    state.write(`${"#".repeat(level)} `);
  }
  state.renderInline(node);
  state.closeBlock(node);
};
