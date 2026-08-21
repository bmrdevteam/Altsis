import { CellData, EditorBlock, TableBlockData } from "editor/types";

export type TFormDraftOp = {
  op: string;
  blockId?: string;
  afterId?: string;
  row?: number;
  col?: number;
  after?: number;
  patch?: Record<string, unknown>;
  dataText?: unknown[];
  block?: EditorBlock;
};

export type TFormDraftApplyInput = {
  kind?: string;
  writeMode?: "create" | "refine";
  formType?: string;
  title?: string;
  blocks?: EditorBlock[];
  ops?: TFormDraftOp[];
};

const newCell = (blockId: string): CellData => ({
  id: `${blockId}-${Math.random().toString(36).slice(2, 10)}`,
  type: "paragraph",
  data: { text: "" },
});

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const findBlock = (blocks: EditorBlock[], blockId: string) =>
  blocks.find((b) => b.id === blockId);

/**
 * 관리자 양식 초안을 현재 블록에 적용한다. 원본은 변경하지 않는다.
 */
export const applyFormDraftToBlocks = (
  current: { title: string; blocks: EditorBlock[] },
  draft: TFormDraftApplyInput
): { applied: boolean; title: string; blocks: EditorBlock[] } => {
  const nextTitle = String(draft?.title || "").trim() || current.title;
  const refine = draft?.writeMode === "refine" && Array.isArray(draft.ops);
  if (!refine) {
    const blocks = Array.isArray(draft?.blocks) ? clone(draft.blocks) : [];
    if (!blocks.length) {
      return {
        applied: false,
        title: current.title,
        blocks: current.blocks,
      };
    }
    return { applied: true, title: nextTitle, blocks };
  }

  const blocks: EditorBlock[] = clone(current.blocks || []);
  let changed = false;
  for (const op of draft.ops || []) {
    if (op.op === "addBlock" && op.block && op.block.type) {
      const block = clone(op.block);
      if (!block.id) {
        block.id = `b_${Math.random().toString(36).slice(2, 10)}`;
      }
      const afterId = String(op.afterId || "");
      const idx = afterId
        ? blocks.findIndex((b) => b.id === afterId)
        : -1;
      if (idx >= 0) blocks.splice(idx + 1, 0, block);
      else blocks.push(block);
      changed = true;
      continue;
    }

    const blockId = String(op.blockId || "");
    const block = findBlock(blocks, blockId);
    if (!block) continue;

    if (op.op === "removeBlock") {
      if (block.type === "image") continue;
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx >= 0) {
        blocks.splice(idx, 1);
        changed = true;
      }
      continue;
    }

    if (op.op === "updateBlockData" && op.patch && typeof op.patch === "object") {
      block.data = { ...(block.data as object), ...op.patch };
      changed = true;
      continue;
    }

    if (block.type !== "table") continue;
    const tableData = block.data as TableBlockData;
    if (!Array.isArray(tableData.table)) continue;

    if (op.op === "addRow") {
      const after =
        typeof op.after === "number" && Number.isInteger(op.after)
          ? op.after
          : tableData.table.length - 1;
      const colCount = tableData.table[0]?.length || 1;
      const row: CellData[] = [];
      for (let i = 0; i < colCount; i += 1) row.push(newCell(block.id));
      tableData.table.splice(Math.max(0, after + 1), 0, row);
      changed = true;
      continue;
    }

    if (op.op === "addColumn") {
      const after =
        typeof op.after === "number" && Number.isInteger(op.after)
          ? op.after
          : (tableData.table[0]?.length || 1) - 1;
      const at = Math.max(0, after + 1);
      if (!Array.isArray(tableData.columns)) tableData.columns = [];
      tableData.columns.splice(at, 0, 1);
      for (const row of tableData.table) {
        row.splice(at, 0, newCell(block.id));
      }
      changed = true;
      continue;
    }

    const row = op.row;
    const col = op.col;
    if (typeof row !== "number" || typeof col !== "number") continue;
    const cell = tableData.table[row]?.[col];
    if (!cell) continue;

    if (op.op === "setDataText" && Array.isArray(op.dataText)) {
      cell.type = "data";
      cell.dataText = op.dataText as CellData["dataText"];
      changed = true;
      continue;
    }

    if (op.op === "updateCell" && op.patch && typeof op.patch === "object") {
      const patch = { ...op.patch } as Record<string, unknown>;
      if (cell.type === "input") delete patch.id;
      if (patch.data && typeof patch.data === "object") {
        cell.data = {
          ...(cell.data || {}),
          ...(patch.data as object),
        };
        delete patch.data;
      }
      Object.assign(cell, patch);
      changed = true;
    }
  }

  if (!changed && nextTitle === current.title) {
    return { applied: false, title: current.title, blocks: current.blocks };
  }
  return { applied: true, title: nextTitle, blocks };
};
