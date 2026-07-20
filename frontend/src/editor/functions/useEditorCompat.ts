/**
 * Compatibility bridge: provides the old useEditor() interface
 * backed by the new Zustand store.
 *
 * Use this ONLY for legacy components (DataConnPopup)
 * that haven't been migrated yet. New code should use useEditorStore directly.
 */
import useEditorStore from "../store/useEditorStore";
import { TableBlockData } from "../types";

export function useEditorCompat() {
  const getCurrentBlock = (): { id: string; type: string; data: any } | undefined => {
    return useEditorStore.getState().getSelectedBlock() as any;
  };

  const getCurrentCell = () => {
    return useEditorStore.getState().getSelectedCell();
  };

  const getCurrentCellIndex = () => {
    const { selectedBlockId, selectedCellPosition } = useEditorStore.getState();
    return {
      id: selectedBlockId,
      row: selectedCellPosition?.row ?? 0,
      column: selectedCellPosition?.col ?? 0,
    };
  };

  const changeCurrentCell = (data: any) => {
    const store = useEditorStore.getState();
    const { selectedBlockId, selectedCellPosition } = store;
    if (!selectedBlockId || !selectedCellPosition) return;
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === selectedBlockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        const cell = td.table?.[selectedCellPosition.row]?.[selectedCellPosition.col];
        if (cell) Object.assign(cell, data);
      }
    });
    store.saveSnapshot();
  };

  const changeCurrentBlockData = (data: any) => {
    const store = useEditorStore.getState();
    const { selectedBlockId } = store;
    if (!selectedBlockId) return;
    store.updateBlockData(selectedBlockId, data);
  };

  return {
    getCurrentBlock,
    getCurrentCell,
    getCurrentCellIndex,
    changeCurrentCell,
    changeCurrentBlockData,
  };
}
