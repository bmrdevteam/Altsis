import { DOMSerializer, type Node as PMNode } from "prosemirror-model";
import { clampIndent, formatIndentPadding } from "./blockIndent";

export const hasNonDefaultTextAlign = (align: unknown): align is string =>
  typeof align === "string" &&
  (align === "center" || align === "right" || align === "justify");

type MdState = {
  write: (text: string) => void;
  renderInline: (node: unknown) => void;
  closeBlock: (node: unknown) => void;
};

export type AlignableNode = {
  attrs: { textAlign?: string | null; level?: number; indent?: number | null };
  content?: PMNode["content"];
  type?: { schema?: PMNode["type"]["schema"]; name?: string };
};

const headingLevel = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 6) return 1;
  return n;
};

export const formatBlockStyle = (align: unknown, indent: unknown): string => {
  const parts: string[] = [];
  if (hasNonDefaultTextAlign(align)) {
    parts.push(`text-align: ${align}`);
  }
  const n = clampIndent(indent);
  if (n > 0) {
    parts.push(`padding-left: ${formatIndentPadding(n)}`);
  }
  return parts.join("; ");
};

/** 내용이 없거나 hardBreak만 있으면 빈 문단으로 본다. */
export const isEmptyAlignableNode = (node: AlignableNode): boolean => {
  if (node.content == null || node.content.size === 0) return true;
  let empty = true;
  node.content.forEach((child) => {
    if (child.type?.name === "hardBreak") return;
    if (child.isText && !child.text) return;
    empty = false;
  });
  return empty;
};

export const shouldSerializeBlockAsHtml = (
  kind: "paragraph" | "heading",
  node: AlignableNode
): boolean => {
  if (hasNonDefaultTextAlign(node.attrs.textAlign)) return true;
  if (clampIndent(node.attrs.indent) > 0) return true;
  return kind === "paragraph" && isEmptyAlignableNode(node);
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

export const wrapStyledBlockHtml = (
  kind: "paragraph" | "heading",
  innerHtml: string,
  options: { align?: unknown; indent?: unknown; level?: unknown } = {}
): string => {
  const style = formatBlockStyle(options.align, options.indent);
  const styleAttr = style ? ` style="${style}"` : "";
  if (kind === "heading") {
    const tag = `h${headingLevel(options.level)}`;
    return `<${tag}${styleAttr}>${innerHtml}</${tag}>`;
  }
  return `<p${styleAttr}>${innerHtml}</p>`;
};

export const wrapAlignedBlockHtml = (
  kind: "paragraph" | "heading",
  align: string,
  innerHtml: string,
  level = 1,
  indent = 0
): string => {
  if (!hasNonDefaultTextAlign(align) && clampIndent(indent) <= 0) {
    return innerHtml;
  }
  return wrapStyledBlockHtml(kind, innerHtml, { align, indent, level });
};

/** 가운데/오른쪽/양쪽 정렬·indent·빈 문단이면 HTML로, 아니면 기본 마크다운으로 직렬화 */
export const serializeAlignedBlock = (
  state: MdState,
  node: AlignableNode,
  kind: "paragraph" | "heading"
): void => {
  if (shouldSerializeBlockAsHtml(kind, node)) {
    const inner = isEmptyAlignableNode(node) ? "" : alignedInlineHtml(node);
    state.write(
      wrapStyledBlockHtml(kind, inner, {
        align: node.attrs.textAlign,
        indent: node.attrs.indent,
        level: node.attrs.level,
      })
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
