import { getHTMLFromFragment } from "@tiptap/core";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { Table } from "@tiptap/extension-table";

const STYLE_ATTR_KEYS = [
  "backgroundColor",
  "verticalAlign",
  "borderColor",
  "borderStyle",
  "borderWidth",
] as const;

export const tableHasCellStyles = (node: PMNode): boolean => {
  let styled = false;
  node.descendants((n) => {
    if (n.type.name !== "tableCell" && n.type.name !== "tableHeader") {
      return;
    }
    const a = n.attrs || {};
    if (STYLE_ATTR_KEYS.some((k) => !!a[k])) {
      styled = true;
      return false;
    }
  });
  return styled;
};

const hasSpan = (node: PMNode) =>
  Number(node.attrs.colspan || 1) > 1 || Number(node.attrs.rowspan || 1) > 1;

/** tiptap-markdown의 isMarkdownSerializable과 동일 — GFM 파이프 표로 쓸 수 있는지 */
const isPipeTableSerializable = (node: PMNode): boolean => {
  const rows: PMNode[] = [];
  node.forEach((row) => rows.push(row));
  if (!rows.length) return false;
  const firstRow = rows[0];
  const bodyRows = rows.slice(1);
  const firstCells: PMNode[] = [];
  firstRow.forEach((cell) => firstCells.push(cell));
  if (
    firstCells.some(
      (cell) =>
        cell.type.name !== "tableHeader" ||
        hasSpan(cell) ||
        cell.childCount > 1
    )
  ) {
    return false;
  }
  for (const row of bodyRows) {
    let bad = false;
    row.forEach((cell) => {
      if (
        cell.type.name === "tableHeader" ||
        hasSpan(cell) ||
        cell.childCount > 1
      ) {
        bad = true;
      }
    });
    if (bad) return false;
  }
  return true;
};

const writeTableAsHtml = (state: any, node: PMNode) => {
  const html = getHTMLFromFragment(Fragment.from(node), node.type.schema);
  state.write(String(html || "").trim());
  state.closeBlock(node);
};

const writePipeTable = (state: any, node: PMNode) => {
  state.inTable = true;
  node.forEach((row: PMNode, _p: number, i: number) => {
    state.write("| ");
    row.forEach((col: PMNode, _p2: number, j: number) => {
      if (j) state.write(" | ");
      const cellContent = col.firstChild;
      if (cellContent && cellContent.textContent?.trim()) {
        state.renderInline(cellContent);
      }
    });
    state.write(" |");
    state.ensureNewLine();
    if (!i) {
      const delimiterRow = Array.from({ length: row.childCount })
        .map(() => "---")
        .join(" | ");
      state.write(`| ${delimiterRow} |`);
      state.ensureNewLine();
    }
  });
  state.closeBlock(node);
  state.inTable = false;
};

/**
 * 셀 배경/테두리/세로정렬이 있으면 HTML로 직렬화해 스타일을 보존한다.
 * (GFM 파이프 표는 셀 style을 표현할 수 없음)
 */
export const StyledTable = Table.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: PMNode, _parent: any) {
          if (tableHasCellStyles(node) || !isPipeTableSerializable(node)) {
            writeTableAsHtml(state, node);
            return;
          }
          writePipeTable(state, node);
        },
        parse: {},
      },
    };
  },
});
