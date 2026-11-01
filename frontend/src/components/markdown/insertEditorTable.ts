import type { Editor } from "@tiptap/core";
import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";


const COLS = 3;
const ROWS_BODY = 2;

type TableSelection = {
  from: number;
  node?: PMNode;
  $from: ResolvedPos;
};

const emptyCell = (type: "tableHeader" | "tableCell") => ({
  type,
  content: [{ type: "paragraph" }],
});

const emptyRow = (type: "tableHeader" | "tableCell") => ({
  type: "tableRow",
  content: Array.from({ length: COLS }, () => emptyCell(type)),
});

const tableContent = {
  type: "table",
  content: [
    emptyRow("tableHeader"),
    ...Array.from({ length: ROWS_BODY }, () => emptyRow("tableCell")),
  ],
};

/** 커서가 표 안이거나 표 자체를 고른 경우, 그 표 바로 다음 위치. */
export function positionAfterSelectedTable(
  selection: TableSelection
): number | null {
  const selected = selection.node;
  if (selected?.type.name === "table") {
    return selection.from + selected.nodeSize;
  }
  const $pos = selection.$from;
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === "table") {
      return $pos.after(depth);
    }
  }
  return null;
}

/** 표의 첫 텍스트 블록 안쪽. descendants 위치는 노드 내용 기준이다. */
export function cursorInFirstTextblock(
  node: PMNode,
  nodePos: number
): number | null {
  let found: number | null = null;
  node.descendants((child, pos) => {
    if (found != null) return false;
    if (child.isTextblock) {
      found = nodePos + pos + 2;
      return false;
    }
    return true;
  });
  return found;
}

/**
 * 헤더 행이 있는 3x3 표를 넣는다.
 * 이미 표 안이면 셀 안에 중첩하지 않고 그 표 바로 뒤에 넣는다.
 */
export function insertEditorTable(editor: Editor): boolean {
  const after = positionAfterSelectedTable(editor.state.selection);
  if (after == null) {
    return editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  const inserted = editor
    .chain()
    .focus()
    .insertContentAt(after, tableContent)
    .run();
  if (!inserted) return false;

  const table = editor.state.doc.nodeAt(after);
  const cursor = table ? cursorInFirstTextblock(table, after) : null;
  if (cursor != null) {
    editor.chain().focus().setTextSelection(cursor).run();
  }
  return true;
}
