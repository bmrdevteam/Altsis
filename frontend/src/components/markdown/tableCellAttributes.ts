/** 표 셀 공통 스타일 속성 — TipTap mergeAttributes가 style을 이어 붙임 */

export type CellStyleAttrs = {
  backgroundColor?: string | null;
  verticalAlign?: string | null;
  borderColor?: string | null;
  borderStyle?: string | null;
  borderWidth?: string | null;
};

export const BORDER_STYLES = [
  { value: "solid", label: "실선" },
  { value: "dashed", label: "파선" },
  { value: "dotted", label: "점선" },
  { value: "double", label: "이중선" },
  { value: "none", label: "없음" },
] as const;

export const BORDER_WIDTHS = [
  { value: "1px", label: "얇게" },
  { value: "2px", label: "보통" },
  { value: "3px", label: "굵게" },
] as const;

export const cellBgHTML = (attributes: CellStyleAttrs) => {
  if (!attributes.backgroundColor) return {};
  return { style: `background-color: ${attributes.backgroundColor}` };
};

export const cellVAlignHTML = (attributes: CellStyleAttrs) => {
  if (!attributes.verticalAlign) return {};
  return { style: `vertical-align: ${attributes.verticalAlign}` };
};

export const cellBorderHTML = (attributes: CellStyleAttrs) => {
  const hasBorder =
    attributes.borderColor || attributes.borderStyle || attributes.borderWidth;
  if (!hasBorder) return {};

  const width = attributes.borderWidth || "1px";
  const borderStyle = attributes.borderStyle || "solid";
  const color = attributes.borderColor || "currentColor";

  return {
    style: `border-width: ${width}; border-style: ${borderStyle}; border-color: ${color}`,
  };
};

const parseBorderWidth = (el: HTMLElement): string | null => {
  const w = el.style.borderWidth || el.style.borderTopWidth;
  if (!w) return null;
  const n = parseFloat(w);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${Math.min(3, Math.max(1, Math.round(n)))}px`;
};

const ALLOWED_BORDER_STYLES = new Set(
  BORDER_STYLES.map((b) => b.value as string)
);

const parseBorderStyle = (el: HTMLElement): string | null => {
  const s = el.style.borderStyle || el.style.borderTopStyle;
  if (!s || s === "initial" || s === "inherit") return null;
  return ALLOWED_BORDER_STYLES.has(s) ? s : null;
};

/** TableCell / TableHeader.extend({ addAttributes })에 그대로 펼침 */
export const tableCellStyleAttributes = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
    renderHTML: (attributes: CellStyleAttrs) => cellBgHTML(attributes),
  },
  verticalAlign: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.style.verticalAlign || null,
    renderHTML: (attributes: CellStyleAttrs) => cellVAlignHTML(attributes),
  },
  borderColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) =>
      element.style.borderColor || element.style.borderTopColor || null,
    renderHTML: (attributes: CellStyleAttrs) => cellBorderHTML(attributes),
  },
  // CSS는 borderColor.renderHTML에서 일괄 출력 — HTML 속성으로 중복되지 않게
  borderStyle: {
    default: null as string | null,
    rendered: false,
    parseHTML: (element: HTMLElement) => parseBorderStyle(element),
  },
  borderWidth: {
    default: null as string | null,
    rendered: false,
    parseHTML: (element: HTMLElement) => parseBorderWidth(element),
  },
};
