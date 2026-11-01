import { Schema } from "prosemirror-model";
import { EditorState, NodeSelection, TextSelection } from "prosemirror-state";
import { tableNodes } from "prosemirror-tables";
import {
  cursorInFirstTextblock,
  positionAfterSelectedTable,
} from "./insertEditorTable";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
    ...tableNodes({
      tableGroup: "block",
      cellContent: "paragraph+",
    }),
  },
});

const cell = (text: string) =>
  schema.nodes.table_cell.create(
    null,
    schema.nodes.paragraph.create(
      null,
      text ? schema.text(text) : undefined
    )
  );

const createTable = () => {
  const header = schema.nodes.table_header.createAndFill()!;
  const row = schema.nodes.table_row.create(null, [
    header,
    schema.nodes.table_header.createAndFill()!,
  ]);
  const body = schema.nodes.table_row.create(null, [cell("가"), cell("나")]);
  return schema.nodes.table.create(null, [row, body]);
};

describe("positionAfterSelectedTable", () => {
  test("returns null outside a table", () => {
    const doc = schema.node("doc", null, [
      schema.nodes.paragraph.create(null, schema.text("본문")),
    ]);
    const state = EditorState.create({ schema, doc });
    expect(positionAfterSelectedTable(state.selection)).toBeNull();
  });

  test("points just after the table that contains the cursor", () => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text("앞"));
    const table = createTable();
    const doc = schema.node("doc", null, [paragraph, table]);
    let inside = 0;
    doc.descendants((node, pos) => {
      if (node.isText && node.text === "나") inside = pos + 1;
    });
    const selection = TextSelection.create(doc, inside);
    expect(positionAfterSelectedTable(selection)).toBe(
      paragraph.nodeSize + table.nodeSize
    );
  });

  test("points after a table selected as a node", () => {
    const table = createTable();
    const doc = schema.node("doc", null, [
      schema.nodes.paragraph.create(),
      table,
    ]);
    const tablePos = doc.child(0).nodeSize;
    const selection = NodeSelection.create(doc, tablePos);
    expect(positionAfterSelectedTable(selection)).toBe(tablePos + table.nodeSize);
  });
});

describe("cursorInFirstTextblock", () => {
  test("lands inside the first cell", () => {
    const paragraph = schema.nodes.paragraph.create();
    const table = createTable();
    const doc = schema.node("doc", null, [paragraph, table]);
    const tablePos = paragraph.nodeSize;
    const cursor = cursorInFirstTextblock(table, tablePos);
    expect(cursor).not.toBeNull();
    const $cursor = doc.resolve(cursor!);
    expect($cursor.parent.isTextblock).toBe(true);

    let firstInTable: number | null = null;
    doc.nodesBetween(tablePos, tablePos + table.nodeSize, (node, pos) => {
      if (firstInTable == null && node.isTextblock) firstInTable = pos + 1;
    });
    expect(cursor).toBe(firstInTable);
  });
});
