import {
  EditorState,
  NodeSelection,
  Transaction,
} from "prosemirror-state";

type DispatchView = {
  state: EditorState;
  dispatch: (tr: Transaction) => void;
};

const atomNodePosAt = (state: EditorState, pos: number): number | null => {
  const size = state.doc.content.size;
  if (!Number.isInteger(pos) || pos < 0 || pos > size) return null;

  const nodeAt = state.doc.nodeAt(pos);
  if (nodeAt?.isAtom && NodeSelection.isSelectable(nodeAt)) return pos;

  const $pos = state.doc.resolve(pos);
  const after = $pos.nodeAfter;
  if (after?.isAtom && NodeSelection.isSelectable(after)) return $pos.pos;

  if (
    $pos.depth > 0 &&
    $pos.parent.isAtom &&
    NodeSelection.isSelectable($pos.parent)
  ) {
    return $pos.before($pos.depth);
  }
  return null;
};

/** 현재 문서 기준으로 atom(이미지 등) NodeSelection을 만든다 */
export const selectAtomAtPos = (
  state: EditorState,
  pos: number
): Transaction | null => {
  const atomPos = atomNodePosAt(state, pos);
  if (atomPos == null) return null;
  try {
    const selection = NodeSelection.create(state.doc, atomPos);
    if (selection.$from.doc !== state.doc) return null;
    return state.tr.setSelection(selection);
  } catch (err) {
    if (err instanceof RangeError) return null;
    throw err;
  }
};

/**
 * 이미지 등 atom 클릭을 현재 doc으로 처리한다.
 * ProseMirror selectClickedLeaf가 옛 ResolvedPos로 setSelection 하는 경로를 막는다.
 * 처리했거나 atom 클릭을 소비해야 하면 true.
 */
export const handleAtomNodeClick = (
  view: DispatchView,
  pos: number
): boolean => {
  const tr = selectAtomAtPos(view.state, pos);
  if (!tr) return false;
  try {
    view.dispatch(tr);
  } catch (err) {
    if (!(err instanceof RangeError)) throw err;
  }
  return true;
};
