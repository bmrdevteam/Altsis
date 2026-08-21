import { DOMSerializer, type Node as PMNode } from "prosemirror-model";

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
  content?: PMNode["content"];
  type?: { schema?: PMNode["type"]["schema"] };
};

const headingLevel = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 6) return 1;
  return n;
};

/**
 * HTML 블록 안은 마크다운(**)이 파싱되지 않으므로 인라인 서식도 HTML로 둔다.
 */
export const alignedInlineHtml = (node: AlignableNode): string => {
  const schema = node.type?.schema;
  if (!schema || node.content == null) return "";
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(
    node.content
  );
  const doc = document.implementation.createHTMLDocument("");
  const container = doc.createElement("div");
  container.appendChild(fragment);
  return (container.innerHTML || "").trim();
};

export const wrapAlignedBlockHtml = (
  kind: "paragraph" | "heading",
  align: string,
  innerHtml: string,
  level = 1
): string => {
  if (!hasNonDefaultTextAlign(align)) return innerHtml;
  if (kind === "heading") {
    const tag = `h${headingLevel(level)}`;
    return `<${tag} style="text-align: ${align}">${innerHtml}</${tag}>`;
  }
  return `<p style="text-align: ${align}">${innerHtml}</p>`;
};

/** 가운데/오른쪽/양쪽 정렬이면 HTML로, 아니면 기본 마크다운으로 직렬화 */
export const serializeAlignedBlock = (
  state: MdState,
  node: AlignableNode,
  kind: "paragraph" | "heading"
): void => {
  const align = node.attrs.textAlign;
  if (hasNonDefaultTextAlign(align)) {
    state.write(
      wrapAlignedBlockHtml(
        kind,
        align,
        alignedInlineHtml(node),
        node.attrs.level
      )
    );
    state.closeBlock(node);
    return;
  }
  if (kind === "heading") {
    state.write(`${"#".repeat(headingLevel(node.attrs.level))} `);
  }
  state.renderInline(node);
  state.closeBlock(node);
};
