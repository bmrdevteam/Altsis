import { readFileSync } from "fs";
import { join } from "path";
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

describe("StyledTable node view", () => {
  test("조회에서도 colgroup을 쓰도록 TableView를 등록한다", () => {
    const src = readFileSync(join(__dirname, "tableMarkdown.ts"), "utf8");
    expect(src).toContain("addNodeView");
    expect(src).toContain("new TableView");
  });
});

describe("createMarkdownExtensions", () => {
  test("조회 모드에서는 슬래시·플레이스홀더를 넣지 않는다", () => {
    const src = readFileSync(
      join(__dirname, "createMarkdownExtensions.ts"),
      "utf8"
    );
    expect(src).toContain("if (editable)");
    expect(src).toContain("SlashCommand");
    expect(src).toContain("Placeholder");
  });
});
