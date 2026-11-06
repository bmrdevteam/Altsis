import { Fragment, Schema, Slice } from "prosemirror-model";
import { EditorState, NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection, tableNodes } from "prosemirror-tables";
import { GapCursor } from "prosemirror-gapcursor";
import {
  closedTableFromSlice,
  createEditorTable,
  cursorInFirstTextblock,
  gapBeforeEnclosingTable,
  insertTableIntoSelection,
  pastedTableForNesting,
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
      cellContent: "block+",
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

const textPos = (doc: ReturnType<Schema["node"]>, text: string) => {
  let at = 0;
  doc.descendants((node, pos) => {
    if (node.isText && node.text === text) at = pos + 1;
  });
  return at;
};

describe("positionAfterSelectedTable", () => {
  test("returns null outside a table", () => {
    const doc = schema.node("doc", null, [
      schema.nodes.paragraph.create(null, schema.text("본문")),
    ]);
    const state = EditorState.create({ schema, doc });
    expect(positionAfterSelectedTable(state.selection)).toBeNull();
  });

  test("returns null when the cursor is inside a table", () => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text("앞"));
    const table = createTable();
    const doc = schema.node("doc", null, [paragraph, table]);
    const selection = TextSelection.create(doc, textPos(doc, "나"));
    expect(positionAfterSelectedTable(selection)).toBeNull();
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

describe("insertTableIntoSelection", () => {
  test("nests a sized table in the cell that holds the cursor", () => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text("본문"));
    const body = schema.nodes.table_cell.create(null, paragraph);
    const outer = schema.nodes.table.create(null, [
      schema.nodes.table_row.create(null, body),
    ]);
    const doc = schema.node("doc", null, [outer]);
    const selection = TextSelection.create(doc, textPos(doc, "본문") + 1);
    const state = EditorState.create({ schema, doc, selection });
    const table = createEditorTable(schema, 2, 4);
    expect(table).not.toBeNull();
    const tr = state.tr;
    const at = insertTableIntoSelection(tr, table!);
    expect(at).not.toBeNull();
    const inserted = tr.doc.nodeAt(at!);
    expect(inserted?.type.name).toBe("table");
    expect(inserted?.childCount).toBe(2);
    expect(inserted?.firstChild?.childCount).toBe(4);
    expect(tr.doc.resolve(at!).parent.type.spec.tableRole).toBe("cell");
    expect(tr.doc.childCount).toBe(1);
  });

  test("inserts after a table selected as a node", () => {
    const table = createTable();
    const doc = schema.node("doc", null, [
      schema.nodes.paragraph.create(),
      table,
    ]);
    const tablePos = doc.child(0).nodeSize;
    const state = EditorState.create({
      schema,
      doc,
      selection: NodeSelection.create(doc, tablePos),
    });
    const next = createEditorTable(schema, 1, 2)!;
    const tr = state.tr;
    const at = insertTableIntoSelection(tr, next);
    expect(at).toBe(tablePos + table.nodeSize);
    expect(tr.doc.childCount).toBe(3);
    expect(tr.doc.child(2).childCount).toBe(1);
    expect(tr.doc.child(2).firstChild?.childCount).toBe(2);
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

describe("pastedTableForNesting", () => {
  const docWithCell = () => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text("본문"));
    const body = schema.nodes.table_cell.create(null, paragraph);
    return schema.node("doc", null, [
      schema.nodes.table.create(null, [
        schema.nodes.table_row.create(null, body),
      ]),
    ]);
  };

  test("nests a closed table pasted at a text cursor inside a cell", () => {
    const doc = docWithCell();
    const selection = TextSelection.create(doc, textPos(doc, "본문"));
    const slice = new Slice(Fragment.from(createTable()), 0, 0);
    expect(pastedTableForNesting(selection, slice)?.type.name).toBe("table");
  });

  test("leaves an open cell slice to the table paste handler", () => {
    const doc = docWithCell();
    const selection = TextSelection.create(doc, textPos(doc, "본문"));
    const slice = new Slice(Fragment.from(createTable()), 1, 1);
    expect(pastedTableForNesting(selection, slice)).toBeNull();
    expect(closedTableFromSlice(slice)).toBeNull();
  });

  test("leaves a cell selection to the table paste handler", () => {
    const doc = docWithCell();
    let cellPos = 0;
    doc.descendants((node, pos) => {
      if (cellPos) return false;
      if (node.type.spec.tableRole === "cell") cellPos = pos;
    });
    const selection = CellSelection.create(doc, cellPos);
    const slice = new Slice(Fragment.from(createTable()), 0, 0);
    expect(pastedTableForNesting(selection, slice)).toBeNull();
  });
});

describe("gapBeforeEnclosingTable", () => {
  test("is valid when the table is the first child of the cell", () => {
    const paragraph = schema.nodes.paragraph.create();
    const body = schema.nodes.table_cell.create(null, paragraph);
    const doc = schema.node("doc", null, [
      schema.nodes.table.create(null, [
        schema.nodes.table_row.create(null, body),
      ]),
    ]);
    let inside = 0;
    doc.descendants((node, pos) => {
      if (node.isTextblock && node.content.size === 0) inside = pos + 1;
    });
    const gap = gapBeforeEnclosingTable(doc.resolve(inside));
    expect(gap).not.toBeNull();
    expect(GapCursor.valid(doc.resolve(gap!))).toBe(true);
  });

  test("is absent when a paragraph stands before the table", () => {
    const leading = schema.nodes.paragraph.create(null, schema.text("앞"));
    const table = createTable();
    const doc = schema.node("doc", null, [leading, table]);
    let inside = 0;
    let seenTable = false;
    doc.descendants((node, pos) => {
      if (node.type.name === "table") seenTable = true;
      if (seenTable && !inside && node.isTextblock) inside = pos + 1;
    });
    expect(gapBeforeEnclosingTable(doc.resolve(inside))).toBeNull();
  });

  test("is valid between two tables", () => {
    const first = schema.nodes.table.create(null, [
      schema.nodes.table_row.create(null, [
        schema.nodes.table_cell.create(null, schema.nodes.paragraph.create()),
      ]),
    ]);
    const second = createTable();
    const doc = schema.node("doc", null, [first, second]);
    let inside = 0;
    let seenTable = 0;
    doc.descendants((node, pos) => {
      if (node.type.name === "table") seenTable += 1;
      if (seenTable === 2 && !inside && node.isTextblock) inside = pos + 1;
    });
    const gap = gapBeforeEnclosingTable(doc.resolve(inside));
    expect(gap).not.toBeNull();
    expect(GapCursor.valid(doc.resolve(gap!))).toBe(true);
    const $gap = doc.resolve(gap!);
    expect($gap.nodeBefore?.type.name).toBe("table");
    expect($gap.nodeAfter?.type.name).toBe("table");
  });
});
