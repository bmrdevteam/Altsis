import {
  applyFormDraftToBlocks,
  TFormDraftApplyInput,
} from "./formDraftApply";
import { EditorBlock } from "editor/types";

const tableBlock = (): EditorBlock => ({
  id: "b-table",
  type: "table",
  data: {
    columns: [1, 1],
    table: [
      [
        {
          id: "c-keep",
          type: "paragraph",
          data: { text: "유지" },
          backgroundColor: "#ffffff",
        },
        {
          id: "c-edit",
          type: "paragraph",
          data: { text: "월요일" },
        },
      ],
      [
        {
          id: "c-input",
          type: "input",
          name: "학습목표",
          data: { text: "" },
        },
        {
          id: "c-other",
          type: "paragraph",
          data: { text: "화요일" },
        },
      ],
    ],
  },
});

describe("applyFormDraftToBlocks", () => {
  test("create replaces blocks", () => {
    const next: TFormDraftApplyInput = {
      writeMode: "create",
      title: "새 시간표",
      blocks: [
        { id: "n1", type: "paragraph", data: { text: "안내" } },
      ],
    };
    const result = applyFormDraftToBlocks(
      { title: "이전", blocks: [tableBlock()] },
      next
    );
    expect(result.applied).toBe(true);
    expect(result.title).toBe("새 시간표");
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].id).toBe("n1");
  });

  test("refine updateCell keeps untouched cells and input ids", () => {
    const current = { title: "강의계획서", blocks: [tableBlock()] };
    const result = applyFormDraftToBlocks(current, {
      writeMode: "refine",
      title: "강의계획서",
      ops: [
        {
          op: "updateCell",
          blockId: "b-table",
          row: 0,
          col: 1,
          patch: { data: { text: "수요일" }, id: "should-not-apply-on-input" },
        },
        {
          op: "updateCell",
          blockId: "b-table",
          row: 1,
          col: 0,
          patch: { id: "hacked-id", placeholder: "목표를 적으세요" },
        },
      ],
    });
    expect(result.applied).toBe(true);
    const table = (result.blocks[0].data as { table: Array<Array<{ id: string; data?: { text?: string }; placeholder?: string }>> }).table;
    expect(table[0][0].data?.text).toBe("유지");
    expect(table[0][1].data?.text).toBe("수요일");
    expect(table[1][0].id).toBe("c-input");
    expect(table[1][0].placeholder).toBe("목표를 적으세요");
    expect(table[1][1].data?.text).toBe("화요일");
  });

  test("refine updateCell applies backgroundColor only to the target cell", () => {
    const current = { title: "강의계획서", blocks: [tableBlock()] };
    const result = applyFormDraftToBlocks(current, {
      writeMode: "refine",
      ops: [
        {
          op: "updateCell",
          blockId: "b-table",
          row: 0,
          col: 1,
          patch: { backgroundColor: "#eef2ff", fontWeight: 700 },
        },
      ],
    });
    expect(result.applied).toBe(true);
    const table = (
      result.blocks[0].data as {
        table: Array<
          Array<{ backgroundColor?: string; fontWeight?: number }>
        >;
      }
    ).table;
    expect(table[0][1].backgroundColor).toBe("#eef2ff");
    expect(table[0][1].fontWeight).toBe(700);
    expect(table[0][0].backgroundColor).toBe("#ffffff");
    expect(table[0][0].fontWeight).toBeUndefined();
    expect(table[1][1].backgroundColor).toBeUndefined();
  });

  test("drops ops for missing block or cell", () => {
    const current = { title: "시간표", blocks: [tableBlock()] };
    const result = applyFormDraftToBlocks(current, {
      writeMode: "refine",
      ops: [
        { op: "updateCell", blockId: "missing", row: 0, col: 0, patch: { data: { text: "x" } } },
        { op: "updateCell", blockId: "b-table", row: 9, col: 9, patch: { data: { text: "x" } } },
      ],
    });
    expect(result.applied).toBe(false);
    expect(
      (current.blocks[0].data as { table: Array<Array<{ data?: { text?: string } }>> }).table[0][0].data?.text
    ).toBe("유지");
  });
});
