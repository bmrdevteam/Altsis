import {
  isSafeColor,
  parsePaddingPx,
  readCellBackground,
  readCellBorder,
  readCellPadding,
  readCellVerticalAlign,
} from "./tableCellAttributes";

export type FlatTableStyle = {
  backgroundColor?: string;
  verticalAlign?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  width?: string;
  padding?: string;
  textAlign?: string;
};

const TEXT_ALIGN = /^(left|center|right|justify)$/i;
const WIDTH_TOKEN = /^(\d+(?:\.\d+)?)(px)?$/i;

const readWidth = (el: HTMLElement): string | undefined => {
  const raw = el.style.width || el.getAttribute("width") || "";
  const m = raw.trim().match(WIDTH_TOKEN);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0 || n > 2000) return undefined;
  return `${Math.round(n)}px`;
};

const readTextAlign = (el: HTMLElement): string | undefined => {
  const raw = el.style.textAlign || el.getAttribute("align") || "";
  return TEXT_ALIGN.test(raw) ? raw.toLowerCase() : undefined;
};

export const readFlatTableStyle = (el: HTMLElement): FlatTableStyle => {
  const out: FlatTableStyle = {};
  const bg = readCellBackground(el);
  if (bg) out.backgroundColor = bg;
  const va = readCellVerticalAlign(el);
  if (va) out.verticalAlign = va;
  const border = readCellBorder(el);
  if (border.borderWidth) out.borderWidth = border.borderWidth;
  if (border.borderStyle) out.borderStyle = border.borderStyle;
  if (border.borderColor) out.borderColor = border.borderColor;
  const width = readWidth(el);
  if (width) out.width = width;
  const padding =
    readCellPadding(el) ||
    parsePaddingPx(
      el.getAttribute("cellpadding")
        ? `${el.getAttribute("cellpadding")}px`
        : null
    );
  if (padding) out.padding = padding;
  const align = readTextAlign(el);
  if (align) out.textAlign = align;
  return out;
};

const hasBorder = (style: {
  borderWidth?: string | null;
  borderStyle?: string | null;
  borderColor?: string | null;
}): boolean => !!(style.borderWidth || style.borderStyle || style.borderColor);

const mergeFlat = (
  ...layers: FlatTableStyle[]
): FlatTableStyle => {
  const out: FlatTableStyle = {};
  for (const layer of layers) {
    Object.assign(out, layer);
  }
  return out;
};

const applyMissing = (cell: HTMLElement, next: FlatTableStyle) => {
  if (next.backgroundColor && !readCellBackground(cell)) {
    cell.style.backgroundColor = next.backgroundColor;
  }
  if (next.verticalAlign && !readCellVerticalAlign(cell)) {
    cell.style.verticalAlign = next.verticalAlign;
  }
  const ownBorder = readCellBorder(cell);
  if (hasBorder(next) && !hasBorder(ownBorder)) {
    if (next.borderWidth) cell.style.borderWidth = next.borderWidth;
    if (next.borderStyle) cell.style.borderStyle = next.borderStyle;
    if (next.borderColor && isSafeColor(next.borderColor)) {
      cell.style.borderColor = next.borderColor;
    }
  }
  if (next.width && !cell.style.width && !cell.getAttribute("width")) {
    cell.style.width = next.width;
    const px = parseInt(next.width, 10);
    if (px) {
      cell.setAttribute("data-colwidth", String(px));
      cell.setAttribute("colwidth", String(px));
    }
  }
  if (next.padding && !readCellPadding(cell)) {
    cell.style.padding = next.padding;
  }
  if (next.textAlign) {
    applyTextAlignToParagraphs(cell, next.textAlign);
  }
};

const applyTextAlignToParagraphs = (cell: HTMLElement, align: string) => {
  const blocks = cell.querySelectorAll("p, h1, h2, h3, h4, h5, h6");
  if (blocks.length === 0) {
    if (cell.querySelector("div, table, ul, ol")) {
      if (!cell.style.textAlign) cell.style.textAlign = align;
      return;
    }
    const p = cell.ownerDocument.createElement("p");
    p.style.textAlign = align;
    while (cell.firstChild) p.appendChild(cell.firstChild);
    cell.appendChild(p);
    return;
  }
  blocks.forEach((block) => {
    const el = block as HTMLElement;
    if (!el.style.textAlign) el.style.textAlign = align;
  });
};

const tableAttrBorder = (table: HTMLTableElement): FlatTableStyle => {
  const raw = table.getAttribute("border");
  if (raw == null) return {};
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return {};
  return { borderWidth: "1px", borderStyle: "solid", borderColor: "#000" };
};

const tableCellPadding = (table: HTMLTableElement): FlatTableStyle => {
  const raw = table.getAttribute("cellpadding");
  if (!raw) return {};
  const padding = parsePaddingPx(`${raw}px`);
  return padding ? { padding } : {};
};

const flattenTable = (table: HTMLTableElement) => {
  const tableStyle = mergeFlat(
    readFlatTableStyle(table),
    tableAttrBorder(table),
    tableCellPadding(table)
  );
  const cols = Array.from(
    table.querySelectorAll(":scope > colgroup > col, :scope > col")
  ) as HTMLElement[];
  const colStyles = cols.map((col) => readFlatTableStyle(col));
  const rows = Array.from(table.rows);
  const tableBorder = hasBorder(tableStyle)
    ? {
        borderWidth: tableStyle.borderWidth,
        borderStyle: tableStyle.borderStyle,
        borderColor: tableStyle.borderColor,
      }
    : {};

  rows.forEach((row) => {
    const trStyle = readFlatTableStyle(row);
    let colIndex = 0;
    Array.from(row.cells).forEach((cell) => {
      const colStyle = colStyles[colIndex] || {};
      const inherited = mergeFlat(tableStyle, colStyle, trStyle);
      // 표 단위 테두리는 셀에 없을 때 격자로 내린다
      applyMissing(cell, mergeFlat(inherited, tableBorder));
      colIndex += cell.colSpan || 1;
    });
  });
};

/** 클립보드 표 HTML에서 table/tr/col 서식을 셀 인라인으로 내린다. */
export const flattenPastedTableStyles = (html: string): string => {
  if (!html || !/<table/i.test(html)) return html;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("table").forEach((table) => {
      flattenTable(table as HTMLTableElement);
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
};
