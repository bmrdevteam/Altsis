import {
  EditorState,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import { CellSelection, cellAround } from "prosemirror-tables";

type DispatchView = {
  state: EditorState;
  dispatch: (tr: Transaction) => void;
};

/**
 * 셀 블록(CellSelection)이 있는 상태에서 셀을 다시 클릭하면
 * ProseMirror MouseDown.up이 옛 문서 기준으로 setSelection 하다가
 * RangeError를 낸다. handleClick에서 현재 doc으로 커서를 접어 그 경로를 막는다.
 */
export const collapseCellSelectionAtPos = (
  state: EditorState,
  pos: number
): Transaction | null => {
  if (!(state.selection instanceof CellSelection)) return null;
  const size = state.doc.content.size;
  if (!Number.isInteger(pos) || pos < 0 || pos > size) return null;

  try {
    const $pos = state.doc.resolve(pos);
    const $target = cellAround($pos) || $pos;
    const selection = TextSelection.near($target);
    if (selection.$from.doc !== state.doc) return null;
    return state.tr.setSelection(selection).scrollIntoView();
  } catch (err) {
    if (err instanceof RangeError) return null;
    throw err;
  }
};

/** CellSelection 클릭을 처리했으면 true — ProseMirror 기본 mouseup 선택을 건너뛴다 */
export const handleTableCellClick = (
  view: DispatchView,
  pos: number
): boolean => {
  if (!(view.state.selection instanceof CellSelection)) return false;
  const tr = collapseCellSelectionAtPos(view.state, pos);
  if (tr) {
    try {
      view.dispatch(tr);
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
    }
    return true;
  }
  // 클릭 좌표를 못 써도, 옛 doc setSelection 경로를 타지 않게 클릭을 소비한다
  try {
    const fallback = TextSelection.near(view.state.selection.$anchorCell);
    if (fallback.$from.doc === view.state.doc) {
      view.dispatch(view.state.tr.setSelection(fallback).scrollIntoView());
    }
  } catch (err) {
    if (!(err instanceof RangeError)) throw err;
  }
  return true;
};
