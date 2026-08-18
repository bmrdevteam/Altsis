import { hasNonDefaultTextAlign } from "./alignedBlockMarkdown";

const STYLE_ATTR_KEYS = [
  "backgroundColor",
  "verticalAlign",
  "borderColor",
  "borderStyle",
  "borderWidth",
] as const;

const hasColWidth = (colwidth: unknown): boolean =>
  Array.isArray(colwidth) &&
  colwidth.some((w) => typeof w === "number" && Number.isFinite(w) && w > 0);

type WalkableNode = {
  type: { name: string };
  attrs?: Record<string, unknown> | null;
  descendants: (fn: (node: WalkableNode) => boolean | void) => void;
};

/** 셀 스타일·열 너비·칸 안 가로 정렬처럼 GFM 파이프 표로 표현할 수 없는 속성이 있는지 */
export const tableHasCellStyles = (node: WalkableNode): boolean => {
  let styled = false;
  node.descendants((n) => {
    if (
      (n.type.name === "paragraph" || n.type.name === "heading") &&
      hasNonDefaultTextAlign(n.attrs?.textAlign)
    ) {
      styled = true;
      return false;
    }
    if (n.type.name !== "tableCell" && n.type.name !== "tableHeader") {
      return;
    }
    const a = n.attrs || {};
    if (STYLE_ATTR_KEYS.some((k) => !!a[k]) || hasColWidth(a.colwidth)) {
      styled = true;
      return false;
    }
  });
  return styled;
};
