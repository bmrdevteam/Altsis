import { Schema } from "prosemirror-model";
import { tableHasCellStyles } from "./tableHasCellStyles";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: { textAlign: { default: "left" } },
    },
    text: { group: "inline" },
    table: { group: "block", content: "tableRow+" },
    tableRow: { content: "tableCell+" },
    tableCell: {
      content: "paragraph+",
      attrs: { backgroundColor: { default: null } },
    },
  },
});

const cellWith = (align: string, bg: string | null = null) => {
  const p = schema.node("paragraph", { textAlign: align }, [
    schema.text("ㅁㄴㅇㄹ"),
  ]);
  return schema.node("tableCell", { backgroundColor: bg }, [p]);
};

const tableFromCells = (cells: ReturnType<typeof cellWith>[]) => {
  const row = schema.node("tableRow", null, cells);
  return schema.node("table", null, [row]);
};

describe("tableHasCellStyles", () => {
  test("가운데 정렬만 있어도 HTML 표로 보낸다", () => {
    const table = tableFromCells([cellWith("center"), cellWith("left")]);
    expect(tableHasCellStyles(table)).toBe(true);
  });

  test("정렬 없는 일반 표는 파이프 표로 둘 수 있다", () => {
    const table = tableFromCells([cellWith("left"), cellWith("left")]);
    expect(tableHasCellStyles(table)).toBe(false);
  });

  test("셀 배경이 있으면 HTML 표다", () => {
    const table = tableFromCells([cellWith("left", "#fff")]);
    expect(tableHasCellStyles(table)).toBe(true);
  });
});
