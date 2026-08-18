import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { CellSelection, cellAround } from "prosemirror-tables";

export const currentTableCellHighlightKey = new PluginKey(
  "currentTableCellHighlight"
);

/** 커서가 있는 칸에 currentCell 클래스를 붙인다. CellSelection은 selectedCell이 있으므로 건너뛴다. */
export const currentCellDecorations = (state: EditorState): DecorationSet => {
  const { selection } = state;
  if (selection instanceof CellSelection) return DecorationSet.empty;

  const $cell = cellAround(selection.$from);
  if (!$cell?.nodeAfter) return DecorationSet.empty;

  const cell = $cell.nodeAfter;
  return DecorationSet.create(state.doc, [
    Decoration.node($cell.pos, $cell.pos + cell.nodeSize, {
      class: "currentCell",
    }),
  ]);
};

export const currentTableCellHighlight = () =>
  new Plugin({
    key: currentTableCellHighlightKey,
    props: {
      decorations: currentCellDecorations,
    },
  });
