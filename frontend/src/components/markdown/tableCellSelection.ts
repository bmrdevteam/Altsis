import { Editor } from "@tiptap/react";
import { CellSelection, TableMap, cellAround } from "@tiptap/pm/tables";

export type MergeDirection = "right" | "down";

const getAnchorCellPos = (editor: Editor): number | null => {
  const { selection } = editor.state;
  if (selection instanceof CellSelection) {
    return selection.$anchorCell.pos;
  }
  const $cell = cellAround(selection.$from);
  return $cell ? $cell.pos : null;
};

/** 현재 셀 기준 인접 셀(오른쪽/아래)과 병합 가능한지 */
export const canMergeAdjacentCells = (
  editor: Editor,
  direction: MergeDirection
): boolean => {
  const cellPos = getAnchorCellPos(editor);
  if (cellPos == null) return false;

  const $cell = editor.state.doc.resolve(cellPos);
  if ($cell.nodeAfter == null) return false;

  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const rect = map.findCell(cellPos - start);

  if (direction === "right") {
    return rect.right < map.width;
  }
  return rect.bottom < map.height;
};

/** 현재 셀과 오른쪽/아래 인접 셀을 선택 후 병합 */
export const mergeAdjacentCells = (
  editor: Editor,
  direction: MergeDirection
): boolean => {
  const cellPos = getAnchorCellPos(editor);
  if (cellPos == null) return false;

  const $anchorCell = editor.state.doc.resolve(cellPos);
  if ($anchorCell.nodeAfter == null) return false;

  const table = $anchorCell.node(-1);
  const map = TableMap.get(table);
  const start = $anchorCell.start(-1);
  const rect = map.findCell(cellPos - start);

  const headRow = direction === "down" ? rect.bottom : rect.top;
  const headCol = direction === "right" ? rect.right : rect.left;

  if (headCol >= map.width || headRow >= map.height) return false;

  const headOffset = map.positionAt(headRow, headCol, table);
  const headPos = start + headOffset;

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const $anchor = tr.doc.resolve(cellPos);
      const $head = tr.doc.resolve(headPos);
      tr.setSelection(new CellSelection($anchor, $head));
      if (dispatch) dispatch(tr);
      return true;
    })
    .mergeCells()
    .run();
};
