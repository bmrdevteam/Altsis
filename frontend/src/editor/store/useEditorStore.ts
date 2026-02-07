import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import useGenerateId from "../../hooks/useGenerateId";
import {
  BlockType,
  CellData,
  CellPosition,
  CellRange,
  CellType,
  EditorBlock,
  EditorStore,
  FormType,
  TableBlockData,
} from "../types";

const generateId = useGenerateId;

function createDefaultCell(blockId: string): CellData {
  return {
    id: `${blockId}-${generateId(12)}`,
    type: "paragraph",
    data: { text: "" },
  };
}

function createDefaultTableData(
  blockId: string,
  rows = 2,
  cols = 3
): TableBlockData {
  const table: CellData[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(createDefaultCell(blockId));
    }
    table.push(row);
  }
  return {
    columns: Array(cols).fill(1),
    table,
  };
}

const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    // ========== State ==========
    formId: "",
    title: "",
    formType: "other" as FormType,
    mode: "edit",
    blocks: [],
    selectedBlockId: null,
    selectedCellPosition: null,
    selectedCellRange: null,
    isDraggingCells: false,
    history: [],
    future: [],
    maxHistory: 100,
    sidebarOpen: true,
    isLoading: true,
    isSaving: false,

    // ========== Initialization ==========
    loadForm: async (formId: string, FormAPI: any) => {
      try {
        const { form } = await FormAPI.RForm({ params: { _id: formId } });
        const blocks =
          Array.isArray(form.data) && form.data[0]?.id !== undefined
            ? form.data.filter((val: any) => val.id !== undefined)
            : [
                {
                  id: `${formId}-initialBlock`,
                  type: "paragraph" as BlockType,
                  data: { text: "" },
                },
              ];

        set((state) => {
          state.formId = formId;
          state.title = form.title || "";
          state.formType = form.type || "other";
          state.blocks = blocks;
          state.isLoading = false;
          state.history = [JSON.stringify(blocks)];
          state.future = [];
        });
      } catch (err) {
        console.error("Failed to load form:", err);
        set((state) => {
          state.isLoading = false;
        });
      }
    },

    saveForm: async (FormAPI: any) => {
      const { formId, title, blocks, formType, isSaving } = get();
      if (isSaving) return;

      set((state) => {
        state.isSaving = true;
      });

      try {
        await FormAPI.UForm({
          params: { _id: formId },
          data: {
            title: title || "undefined",
            data: blocks,
          },
        });
        alert(globalThis.SUCCESS_MESSAGE);
      } catch (err) {
        console.error("Failed to save form:", err);
      } finally {
        set((state) => {
          state.isSaving = false;
        });
      }
    },

    // ========== Title ==========
    setTitle: (title: string) => {
      set((state) => {
        state.title = title;
      });
    },

    // ========== Mode ==========
    setMode: (mode) => {
      set((state) => {
        state.mode = mode;
      });
    },
    toggleMode: () => {
      set((state) => {
        state.mode = state.mode === "edit" ? "preview" : "edit";
      });
    },

    // ========== Sidebar ==========
    toggleSidebar: () => {
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      });
    },

    // ========== Selection ==========
    selectBlock: (blockId) => {
      set((state) => {
        if (state.selectedBlockId !== blockId) {
          state.selectedCellPosition = null;
          state.selectedCellRange = null;
        }
        state.selectedBlockId = blockId;
      });
    },
    selectCell: (position, blockId) => {
      set((state) => {
        if (blockId !== undefined) {
          if (state.selectedBlockId !== blockId) {
            state.selectedCellPosition = null;
            state.selectedCellRange = null;
          }
          state.selectedBlockId = blockId;
        }
        state.selectedCellPosition = position;
        state.selectedCellRange = null;
      });
    },
    selectCellRange: (range) => {
      set((state) => {
        state.selectedCellRange = range;
        state.selectedCellPosition = range ? range.start : null;
      });
    },
    startCellDrag: (position, blockId) => {
      set((state) => {
        if (blockId !== undefined) {
          if (state.selectedBlockId !== blockId) {
            state.selectedCellPosition = null;
            state.selectedCellRange = null;
          }
          state.selectedBlockId = blockId;
        }
        state.isDraggingCells = true;
        state.selectedCellPosition = position;
        state.selectedCellRange = { start: position, end: position };
      });
    },
    updateCellDrag: (position) => {
      set((state) => {
        if (!state.isDraggingCells || !state.selectedCellRange) return;
        state.selectedCellRange = { start: state.selectedCellRange.start, end: position };
      });
    },
    endCellDrag: () => {
      set((state) => {
        state.isDraggingCells = false;
        if (state.selectedCellRange) {
          const { start, end } = state.selectedCellRange;
          if (start.row === end.row && start.col === end.col) {
            state.selectedCellRange = null;
          }
        }
      });
    },
    getSelectedCells: () => {
      const { selectedCellRange, selectedCellPosition } = get();
      if (!selectedCellRange) {
        return selectedCellPosition ? [selectedCellPosition] : [];
      }
      const minRow = Math.min(selectedCellRange.start.row, selectedCellRange.end.row);
      const maxRow = Math.max(selectedCellRange.start.row, selectedCellRange.end.row);
      const minCol = Math.min(selectedCellRange.start.col, selectedCellRange.end.col);
      const maxCol = Math.max(selectedCellRange.start.col, selectedCellRange.end.col);
      const cells: CellPosition[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          cells.push({ row: r, col: c });
        }
      }
      return cells;
    },
    updateSelectedCells: (blockId, data) => {
      const cells = get().getSelectedCells();
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          for (const pos of cells) {
            const cell = tableData.table?.[pos.row]?.[pos.col];
            if (cell) Object.assign(cell, data);
          }
        }
      });
      get().saveSnapshot();
    },

    // ========== Block Operations ==========
    addBlock: ({ blockType, insertAfterIndex, blockData }) => {
      const { formId } = get();
      const blockId = generateId(12);
      const id = `${formId}-${blockId}`;

      let data: any;
      if (blockData) {
        data = blockData;
      } else if (blockType === "table") {
        data = createDefaultTableData(blockId);
      } else if (blockType === "paragraph") {
        data = { text: "" };
      } else if (blockType === "divider") {
        data = {};
      } else if (blockType === "input") {
        data = { label: "", placeholder: "", required: false };
      } else if (blockType === "image") {
        data = { src: "", alt: "", width: 100, alignment: "center" };
      } else {
        data = { text: "" };
      }

      const block: EditorBlock = { id, type: blockType, data };

      set((state) => {
        if (
          insertAfterIndex !== undefined &&
          insertAfterIndex >= 0 &&
          insertAfterIndex <= state.blocks.length
        ) {
          state.blocks.splice(insertAfterIndex, 0, block);
        } else {
          state.blocks.push(block);
        }
        state.selectedBlockId = id;
      });
      get().saveSnapshot();
    },

    removeBlock: (blockId) => {
      set((state) => {
        const index = state.blocks.findIndex((b) => b.id === blockId);
        if (index >= 0) {
          state.blocks.splice(index, 1);
          if (state.selectedBlockId === blockId) {
            state.selectedBlockId = null;
            state.selectedCellPosition = null;
          }
        }
      });
      get().saveSnapshot();
    },

    moveBlock: (fromIndex, toIndex) => {
      set((state) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.blocks.length ||
          toIndex < 0 ||
          toIndex >= state.blocks.length
        ) {
          return;
        }
        const [block] = state.blocks.splice(fromIndex, 1);
        state.blocks.splice(toIndex, 0, block);
      });
      get().saveSnapshot();
    },

    duplicateBlock: (blockId) => {
      const state = get();
      const index = state.blocks.findIndex((b) => b.id === blockId);
      if (index < 0) return;

      const original = state.blocks[index];
      const blockData = JSON.parse(JSON.stringify(original.data));

      // Regenerate IDs for table cells
      if (original.type === "table" && blockData.table) {
        blockData.table = blockData.table.map((row: CellData[]) =>
          row.map((cell) => ({
            ...cell,
            id: `${generateId(12)}-${generateId(12)}`,
          }))
        );
      }

      state.addBlock({
        blockType: original.type,
        insertAfterIndex: index + 1,
        blockData,
      });
    },

    updateBlockData: (blockId, data) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block) {
          Object.assign(block.data, data);
        }
      });
      get().saveSnapshot();
    },

    // ========== Cell Operations ==========
    updateCell: (blockId, row, col, data) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          const cell = tableData.table?.[row]?.[col];
          if (cell) {
            Object.assign(cell, data);
          }
        }
      });
      get().saveSnapshot();
    },

    saveCell: (blockIndex, row, col, data) => {
      set((state) => {
        const block = state.blocks[blockIndex];
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          const cell = tableData.table?.[row]?.[col];
          if (cell) {
            Object.assign(cell, data);
          }
        }
      });
    },

    changeCellType: (blockId, row, col, newType) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          const cell = tableData.table?.[row]?.[col];
          if (cell) {
            cell.type = newType;
          }
        }
      });
      get().saveSnapshot();
    },

    setCellColumn: (blockId, colIndex, ratio) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          if (tableData.columns) {
            tableData.columns[colIndex] = ratio;
          }
        }
      });
    },

    addRow: (blockId, afterRow) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          const colCount = tableData.table[0]?.length || 1;
          const newRow: CellData[] = [];
          for (let i = 0; i < colCount; i++) {
            newRow.push(createDefaultCell(block.id));
          }
          tableData.table.splice(afterRow + 1, 0, newRow);
        }
      });
      get().saveSnapshot();
    },

    addColumn: (blockId, afterCol) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          tableData.columns.splice(afterCol, 0, 1);
          for (const row of tableData.table) {
            row.splice(afterCol + 1, 0, createDefaultCell(block.id));
          }
        }
      });
      get().saveSnapshot();
    },

    insertColumnBefore: (blockId, beforeCol) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          tableData.columns.splice(beforeCol, 0, 1);
          for (const row of tableData.table) {
            row.splice(beforeCol, 0, createDefaultCell(block.id));
          }
        }
      });
      get().saveSnapshot();
    },

    removeRow: (blockId, row) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          if (tableData.table.length > 1) {
            tableData.table.splice(row, 1);
          }
        }
      });
      get().saveSnapshot();
    },

    removeColumn: (blockId, col) => {
      set((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const tableData = block.data as TableBlockData;
          if (tableData.table[0]?.length > 1) {
            tableData.columns.splice(col, 1);
            for (const row of tableData.table) {
              row.splice(col, 1);
            }
          }
        }
      });
      get().saveSnapshot();
    },

    // ========== Undo/Redo ==========
    saveSnapshot: () => {
      set((state) => {
        const snapshot = JSON.stringify(state.blocks);
        const lastSnapshot = state.history[state.history.length - 1];
        // Don't save duplicate snapshots
        if (snapshot === lastSnapshot) return;

        state.history.push(snapshot);
        state.future = [];
        if (state.history.length > state.maxHistory) {
          state.history.shift();
        }
      });
    },

    undo: () => {
      set((state) => {
        if (state.history.length <= 1) return;
        const current = state.history.pop()!;
        state.future.push(current);
        const previous = state.history[state.history.length - 1];
        if (previous) {
          state.blocks = JSON.parse(previous);
        }
      });
    },

    redo: () => {
      set((state) => {
        if (state.future.length === 0) return;
        const next = state.future.pop()!;
        state.history.push(next);
        state.blocks = JSON.parse(next);
      });
    },

    // ========== Getters ==========
    getBlock: (blockId) => {
      return get().blocks.find((b) => b.id === blockId);
    },

    getBlockByIndex: (index) => {
      return get().blocks[index];
    },

    getBlockIndex: (blockId) => {
      return get().blocks.findIndex((b) => b.id === blockId);
    },

    getSelectedBlock: () => {
      const { blocks, selectedBlockId } = get();
      if (!selectedBlockId) return undefined;
      return blocks.find((b) => b.id === selectedBlockId);
    },

    getSelectedCell: () => {
      const { blocks, selectedBlockId, selectedCellPosition } = get();
      if (!selectedBlockId || !selectedCellPosition) return null;
      const block = blocks.find((b) => b.id === selectedBlockId);
      if (!block || block.type !== "table") return null;
      const tableData = block.data as TableBlockData;
      return (
        tableData.table?.[selectedCellPosition.row]?.[
          selectedCellPosition.col
        ] ?? null
      );
    },

    getCellColumn: (blockId, colIndex) => {
      const block = get().blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const tableData = block.data as TableBlockData;
        return tableData.columns?.[colIndex] ?? 1;
      }
      return 1;
    },
  }))
);

export default useEditorStore;
