/** 표 셀 공통 스타일 속성 — TipTap mergeAttributes가 style을 이어 붙임 */

export type CellStyleAttrs = {
  backgroundColor?: string | null;
  verticalAlign?: string | null;
  borderColor?: string | null;
  borderStyle?: string | null;
  borderWidth?: string | null;
  padding?: string | null;
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

const ALLOWED_BORDER_STYLES = new Set(
  BORDER_STYLES.map((b) => b.value as string)
);

const COLOR_MAX = 80;

export const isSafeColor = (
  value: string | null | undefined
): value is string => {
  if (!value) return false;
  const v = value.trim();
  if (!v || v.length > COLOR_MAX) return false;
  const lower = v.toLowerCase();
  return (
    !lower.includes("url(") &&
    !lower.includes("expression(") &&
    !lower.includes("javascript:") &&
    !lower.includes("behavior:")
  );
};

export const parsePaddingPx = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d+(?:\.\d+)?)px$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 48) return null;
  return `${Math.round(n)}px`;
};

export const clampBorderWidth = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${Math.min(3, Math.max(1, Math.round(n)))}px`;
};

export const parseBorderShorthand = (
  raw: string | null | undefined
): Pick<CellStyleAttrs, "borderWidth" | "borderStyle" | "borderColor"> => {
  const out: Pick<
    CellStyleAttrs,
    "borderWidth" | "borderStyle" | "borderColor"
  > = {
    borderWidth: null,
    borderStyle: null,
    borderColor: null,
  };
  if (!raw?.trim()) return out;
  if (/url\(|expression\(|javascript:/i.test(raw)) return out;
  const tokens = raw.trim().split(/\s+/);
  for (const token of tokens) {
    if (ALLOWED_BORDER_STYLES.has(token)) {
      out.borderStyle = token;
      continue;
    }
    const width = clampBorderWidth(token);
    if (width) {
      out.borderWidth = width;
      continue;
    }
    if (isSafeColor(token)) out.borderColor = token;
  }
  return out;
};

export const readCellBackground = (el: HTMLElement): string | null => {
  if (isSafeColor(el.style.backgroundColor)) return el.style.backgroundColor;
  const bg = el.style.background?.trim();
  if (bg && isSafeColor(bg) && !/\s/.test(bg)) return bg;
  const attr = el.getAttribute("bgcolor");
  return isSafeColor(attr) ? attr.trim() : null;
};

export const readCellVerticalAlign = (el: HTMLElement): string | null => {
  const fromStyle = el.style.verticalAlign;
  if (fromStyle && fromStyle !== "initial" && fromStyle !== "inherit") {
    return fromStyle;
  }
  return el.getAttribute("valign");
};

export const readCellPadding = (el: HTMLElement): string | null => {
  return (
    parsePaddingPx(el.style.padding) || parsePaddingPx(el.style.paddingTop)
  );
};

export const readCellBorder = (
  el: HTMLElement
): Pick<CellStyleAttrs, "borderWidth" | "borderStyle" | "borderColor"> => {
  const fromShort = parseBorderShorthand(
    el.style.border || el.style.borderTop || null
  );
  const width =
    clampBorderWidth(el.style.borderWidth || el.style.borderTopWidth) ||
    fromShort.borderWidth;
  const styleRaw = el.style.borderStyle || el.style.borderTopStyle;
  const style =
    styleRaw &&
    styleRaw !== "initial" &&
    styleRaw !== "inherit" &&
    ALLOWED_BORDER_STYLES.has(styleRaw)
      ? styleRaw
      : fromShort.borderStyle;
  const colorRaw =
    el.style.borderColor || el.style.borderTopColor || fromShort.borderColor;
  const color = isSafeColor(colorRaw) ? colorRaw.trim() : null;
  return { borderWidth: width, borderStyle: style, borderColor: color };
};

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

export const cellPaddingHTML = (attributes: CellStyleAttrs) => {
  if (!attributes.padding) return {};
  return { style: `padding: ${attributes.padding}` };
};

/** TableCell / TableHeader.extend({ addAttributes })에 그대로 펼침 */
export const tableCellStyleAttributes = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => readCellBackground(element),
    renderHTML: (attributes: CellStyleAttrs) => cellBgHTML(attributes),
  },
  verticalAlign: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => readCellVerticalAlign(element),
    renderHTML: (attributes: CellStyleAttrs) => cellVAlignHTML(attributes),
  },
  borderColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => readCellBorder(element).borderColor,
    renderHTML: (attributes: CellStyleAttrs) => cellBorderHTML(attributes),
  },
  borderStyle: {
    default: null as string | null,
    rendered: false,
    parseHTML: (element: HTMLElement) => readCellBorder(element).borderStyle,
  },
  borderWidth: {
    default: null as string | null,
    rendered: false,
    parseHTML: (element: HTMLElement) => readCellBorder(element).borderWidth,
  },
  padding: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => readCellPadding(element),
    renderHTML: (attributes: CellStyleAttrs) => cellPaddingHTML(attributes),
  },
};
