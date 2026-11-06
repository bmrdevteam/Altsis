import type { Editor } from "@tiptap/core";
import {
  Fragment,
  Slice,
  type Node as PMNode,
  type ResolvedPos,
  type Schema,
} from "prosemirror-model";
import {
  NodeSelection,
  TextSelection,
  type Selection,
  type Transaction,
} from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { GapCursor } from "prosemirror-gapcursor";

const nodeByRole = (schema: Schema, role: string) =>
  Object.values(schema.nodes).find((type) => type.spec.tableRole === role);

/** 헤더 행이 있는 rows×cols 표. 행·열 기본값은 없다. */
export function createEditorTable(
  schema: Schema,
  rows: number,
  cols: number
): PMNode | null {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    return null;
  }
  const table = nodeByRole(schema, "table");
  const rowType = nodeByRole(schema, "row");
  const cell = nodeByRole(schema, "cell");
  const header = nodeByRole(schema, "header_cell");
  const paragraph = schema.nodes.paragraph;
  if (!table || !rowType || !cell || !header || !paragraph) return null;

  const cellOf = (type: typeof cell) =>
    type.createAndFill() ?? type.create(null, paragraph.create());
  const rowOf = (type: typeof cell) =>
    rowType.create(
      null,
      Array.from({ length: cols }, () => cellOf(type))
    );
  const content = [rowOf(header)];
  for (let i = 1; i < rows; i += 1) content.push(rowOf(cell));
  return table.create(null, content);
}

/** 표 노드를 고른 경우, 그 표 바로 다음 위치. 칸 안 커서는 해당하지 않는다. */
export function positionAfterSelectedTable(selection: Selection): number | null {
  if (selection instanceof NodeSelection && selection.node.type.name === "table") {
    return selection.from + selection.node.nodeSize;
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

const gapCursorValid = (
  GapCursor as typeof GapCursor & { valid($pos: ResolvedPos): boolean }
).valid;

const enclosingTableDepth = ($pos: ResolvedPos): number => {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === "table") return depth;
  }
  return -1;
};

/**
 * 표 노드를 현재 선택 자리에 넣는다.
 * 글자 커서면 그 문단 기준(칸 안이면 그 칸의 자식), 표 노드 선택이면 그 표 뒤.
 * 넣은 표의 위치를 반환한다.
 */
export function insertTableIntoSelection(
  tr: Transaction,
  table: PMNode
): number | null {
  const after = positionAfterSelectedTable(tr.selection);
  if (after != null) {
    const $after = tr.doc.resolve(after);
    if (!$after.parent.canReplace($after.index(), $after.index(), Fragment.from(table))) {
      return null;
    }
    tr.insert(after, table);
    return after;
  }
  if (!(tr.selection instanceof TextSelection)) return null;
  const $from = tr.selection.$from;
  if (!$from.parent.isTextblock) return null;
  const depth = $from.depth;
  const parent = $from.node(depth - 1);
  const index = $from.index(depth - 1);
  const frag = Fragment.from(table);

  if ($from.parent.content.size === 0) {
    if (!parent.canReplace(index, index + 1, frag)) return null;
    const start = $from.before(depth);
    tr.replaceWith(start, $from.after(depth), table);
    return start;
  }
  if ($from.parentOffset === 0) {
    if (!parent.canReplace(index, index, frag)) return null;
    const at = $from.before(depth);
    tr.insert(at, table);
    return at;
  }
  if ($from.parentOffset === $from.parent.content.size) {
    if (!parent.canReplace(index + 1, index + 1, frag)) return null;
    const at = $from.after(depth);
    tr.insert(at, table);
    return at;
  }
  if (!parent.canReplace(index + 1, index + 1, frag)) return null;
  const splitAt = $from.pos;
  tr.split(splitAt);
  const $mapped = tr.doc.resolve(tr.mapping.map(splitAt));
  const at = $mapped.before($mapped.depth);
  tr.insert(at, table);
  return at;
}

/** 표 바로 앞을 갭 커서로 둘 수 있는지. */
export function isTableGap($pos: ResolvedPos): boolean {
  return gapCursorValid($pos);
}

/** 닫힌 표 슬라이스. 칸 선택으로 복사한 열린 조각은 아니다. */
export function closedTableFromSlice(slice: Slice): PMNode | null {
  if (slice.openStart !== 0 || slice.openEnd !== 0) return null;
  if (slice.content.childCount !== 1) return null;
  const node = slice.content.firstChild;
  if (!node || node.type.name !== "table") return null;
  return node;
}

/**
 * 칸 안 글자 커서에 표 전체를 붙여넣을 때 중첩할 표.
 * 칸 선택·열린 칸 조각·표 밖은 null 이라 기존 붙여넣기에 맡긴다.
 */
export function pastedTableForNesting(
  selection: Selection,
  slice: Slice
): PMNode | null {
  if (selection instanceof CellSelection) return null;
  if (!(selection instanceof TextSelection)) return null;
  if (enclosingTableDepth(selection.$from) < 0) return null;
  return closedTableFromSlice(slice);
}

/**
 * 첫 행의 맨 앞이고 표 바로 앞이 갭으로 유효하면 그 위치.
 * 앞에 문단이 있으면 null.
 */
export function gapBeforeEnclosingTable($from: ResolvedPos): number | null {
  const tableDepth = enclosingTableDepth($from);
  if (tableDepth < 0) return null;
  if ($from.index(tableDepth) !== 0) return null;
  if ($from.parentOffset !== 0) return null;
  let cellDepth = -1;
  for (let depth = $from.depth; depth > tableDepth; depth -= 1) {
    const role = $from.node(depth).type.spec.tableRole;
    if (role === "cell" || role === "header_cell") {
      cellDepth = depth;
      break;
    }
  }
  if (cellDepth < 0) return null;
  if ($from.index(cellDepth) !== 0) return null;
  for (let depth = cellDepth + 1; depth < $from.depth; depth += 1) {
    if ($from.index(depth) !== 0) return null;
  }
  const before = $from.before(tableDepth);
  if (!gapCursorValid($from.doc.resolve(before))) return null;
  return before;
}

const placeCursorInTable = (tr: Transaction, table: PMNode, at: number) => {
  const cursor = cursorInFirstTextblock(table, at);
  if (cursor == null) return;
  tr.setSelection(TextSelection.create(tr.doc, cursor));
};

/** 헤더 행이 있는 표를 커서 자리 또는 선택된 표 뒤에 넣는다. */
export function insertEditorTable(
  editor: Editor,
  rows: number,
  cols: number
): boolean {
  const table = createEditorTable(editor.schema, rows, cols);
  if (!table) return false;
  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const at = insertTableIntoSelection(tr, table);
      if (at == null) return false;
      if (dispatch) {
        placeCursorInTable(tr, table, at);
        dispatch(tr);
      }
      return true;
    })
    .run();
}

/** 칸 안에 붙여넣은 닫힌 표를 커서 자리에 넣는다. 처리했으면 true. */
export function nestPastedTable(
  tr: Transaction,
  selection: Selection,
  slice: Slice
): boolean {
  const table = pastedTableForNesting(selection, slice);
  if (!table) return false;
  const at = insertTableIntoSelection(tr, table);
  if (at == null) return false;
  placeCursorInTable(tr, table, at);
  return true;
}
