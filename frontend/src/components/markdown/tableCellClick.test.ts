import { Schema } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { CellSelection, tableNodes } from "prosemirror-tables";
import {
  collapseCellSelectionAtPos,
  handleTableCellClick,
} from "./tableCellClick";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
    ...tableNodes({
      tableGroup: "block",
      cellContent: "paragraph+",
    }),
  },
});

const createTableDoc = () => {
  const header = () => schema.nodes.table_header.createAndFill();
  const cell = () => schema.nodes.table_cell.createAndFill();
  if (!header() || !cell()) {
    throw new Error("table cells could not be created");
  }
  const headerRow = schema.nodes.table_row.create(null, [header()!, header()!]);
  const bodyRow = schema.nodes.table_row.create(null, [cell()!, cell()!]);
  const table = schema.nodes.table.create(null, [headerRow, bodyRow]);
  return schema.node("doc", null, [table]);
};

const findCellPositions = (state: EditorState): number[] => {
  const positions: number[] = [];
  state.doc.descendants((node, pos) => {
    if (
      node.type.spec.tableRole === "cell" ||
      node.type.spec.tableRole === "header_cell"
    ) {
      positions.push(pos);
    }
  });
  return positions;
};

const stateWithCellBlock = () => {
  const doc = createTableDoc();
  let state = EditorState.create({ schema, doc });
  const cells = findCellPositions(state);
  const selection = new CellSelection(
    state.doc.resolve(cells[0]),
    state.doc.resolve(cells[1])
  );
  state = state.apply(state.tr.setSelection(selection));
  return { state, cells };
};

describe("tableCellClick", () => {
  test("셀 블록 선택 후 클릭하면 현재 문서 기준 텍스트 커서로 접는다", () => {
    const { state, cells } = stateWithCellBlock();
    expect(state.selection).toBeInstanceOf(CellSelection);

    const tr = collapseCellSelectionAtPos(state, cells[0] + 1);
    expect(tr).not.toBeNull();
    const next = state.apply(tr!);
    expect(next.selection).toBeInstanceOf(TextSelection);
    expect(next.selection.empty).toBe(true);
  });

  test("CellSelection이 아니면 클릭을 처리하지 않는다", () => {
    const state = EditorState.create({ schema, doc: createTableDoc() });
    expect(collapseCellSelectionAtPos(state, 1)).toBeNull();
    expect(handleTableCellClick({ state, dispatch: () => undefined }, 1)).toBe(
      false
    );
  });

  test("범위 밖 pos여도 CellSelection 클릭은 소비하고 RangeError를 내지 않는다", () => {
    const { state } = stateWithCellBlock();
    let dispatched = false;
    const view = {
      state,
      dispatch: () => {
        dispatched = true;
      },
    };
    expect(() => {
      expect(handleTableCellClick(view, 99999)).toBe(true);
    }).not.toThrow();
    expect(dispatched).toBe(true);
  });

  test("handleTableCellClick이 현재 문서에 TextSelection을 dispatch한다", () => {
    const { state, cells } = stateWithCellBlock();
    let next = state;
    handleTableCellClick(
      {
        state,
        dispatch: (tr) => {
          next = state.apply(tr);
        },
      },
      cells[0] + 1
    );
    expect(next.selection).toBeInstanceOf(TextSelection);
    expect(next.selection.$from.doc).toBe(next.doc);
  });

  test("옛 CellSelection을 새 문서에 넣으면 RangeError가 난다", () => {
    const { state } = stateWithCellBlock();
    const stale = state.selection as CellSelection;
    const grown = state.apply(
      state.tr.insert(
        state.doc.content.size,
        schema.nodes.paragraph.createAndFill()!
      )
    );
    expect(() => {
      grown.tr.setSelection(stale);
    }).toThrow(/must point at the current document/);
  });
});
