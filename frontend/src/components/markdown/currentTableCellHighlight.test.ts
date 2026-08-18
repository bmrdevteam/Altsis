import { Schema } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { CellSelection, tableNodes } from "prosemirror-tables";
import { currentCellDecorations } from "./currentTableCellHighlight";

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

describe("currentTableCellHighlight", () => {
  test("칸 안 커서이면 currentCell 장식을 붙인다", () => {
    const doc = createTableDoc();
    const state = EditorState.create({ schema, doc });
    const cells = findCellPositions(state);
    const next = state.apply(
      state.tr.setSelection(TextSelection.near(state.doc.resolve(cells[2] + 1)))
    );
    const decos = currentCellDecorations(next);
    expect(decos.find().length).toBe(1);
    expect(decos.find()[0].from).toBe(cells[2]);
  });

  test("셀 블록 선택이면 장식을 붙이지 않는다", () => {
    const doc = createTableDoc();
    let state = EditorState.create({ schema, doc });
    const cells = findCellPositions(state);
    state = state.apply(
      state.tr.setSelection(
        new CellSelection(
          state.doc.resolve(cells[0]),
          state.doc.resolve(cells[1])
        )
      )
    );
    expect(currentCellDecorations(state).find()).toHaveLength(0);
  });
});
