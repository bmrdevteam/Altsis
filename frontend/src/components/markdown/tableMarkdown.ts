import { getHTMLFromFragment } from "@tiptap/core";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { Table, TableView } from "@tiptap/extension-table";
import { currentTableCellHighlight } from "./currentTableCellHighlight";
import { gapBeforeEnclosingTable, isTableGap } from "./insertEditorTable";
import {
  tableContainsNestedTable,
  tableHasCellStyles,
} from "./tableHasCellStyles";

const TABLE_GAP_PX = 8;

const tablePosBeforeWrapper = (
  view: EditorView,
  wrapper: HTMLElement
): number | null => {
  let pos: number;
  try {
    pos = view.posAtDOM(wrapper, 0);
  } catch {
    return null;
  }
  const $pos = view.state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === "table") return $pos.before(depth);
  }
  if ($pos.nodeAfter?.type.name === "table") return $pos.pos;
  return null;
};

/** 표 위쪽 가장자리 클릭과 첫 행 ↑ 로 표 앞 갭 커서를 잡는다. */
const tableGapCursor = () =>
  new Plugin({
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          if (!view.editable || event.button !== 0) return false;
          const target = event.target;
          if (!(target instanceof Element)) return false;
          const wrapper = target.closest(".tableWrapper");
          if (!(wrapper instanceof HTMLElement)) return false;
          const rect = wrapper.getBoundingClientRect();
          if (event.clientY - rect.top > TABLE_GAP_PX) return false;
          const before = tablePosBeforeWrapper(view, wrapper);
          if (before == null) return false;
          const $before = view.state.doc.resolve(before);
          if (!isTableGap($before)) return false;
          event.preventDefault();
          view.dispatch(view.state.tr.setSelection(new GapCursor($before)));
          return true;
        },
      },
      handleKeyDown(view, event) {
        if (event.key !== "ArrowUp" || event.shiftKey || !view.editable) {
          return false;
        }
        const { selection } = view.state;
        if (!(selection instanceof TextSelection) || !selection.empty) return false;
        const before = gapBeforeEnclosingTable(selection.$from);
        if (before == null) return false;
        event.preventDefault();
        view.dispatch(
          view.state.tr.setSelection(new GapCursor(view.state.doc.resolve(before)))
        );
        return true;
      },
    },
  });

const hasSpan = (node: PMNode) =>
  Number(node.attrs.colspan || 1) > 1 || Number(node.attrs.rowspan || 1) > 1;

/** tiptap-markdown의 isMarkdownSerializable과 동일 — GFM 파이프 표로 쓸 수 있는지 */
export const isPipeTableSerializable = (node: PMNode): boolean => {
  if (tableContainsNestedTable(node)) return false;
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
 * 셀 배경/테두리/세로정렬·칸 안 가로 정렬이 있으면 HTML로 직렬화해 스타일을 보존한다.
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
  addProseMirrorPlugins() {
    return [
      tableGapCursor(),
      ...(this.parent?.() || []),
      currentTableCellHighlight(),
    ];
  },
  /**
   * columnResizing은 editable일 때만 TableView를 붙인다.
   * 조회(editable:false)에서도 colgroup·tableWrapper가 같아야
   * 편집 화면과 표 너비가 맞는다.
   */
  addNodeView() {
    return ({ node }) => new TableView(node, this.options.cellMinWidth);
  },
});
