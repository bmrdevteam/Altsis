import { flattenPastedTableStyles } from "./pasteTableStyles";
import {
  parseBorderShorthand,
  parsePaddingPx,
  readCellBackground,
  readCellBorder,
} from "./tableCellAttributes";

const parseBody = (html: string) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body;
};

describe("flattenPastedTableStyles", () => {
  test("copies table background and border onto cells", () => {
    const out = flattenPastedTableStyles(
      `<table style="background-color:#eee;border:1px solid #333"><tr><td>a</td><td>b</td></tr></table>`
    );
    const cells = parseBody(out).querySelectorAll("td");
    expect(cells).toHaveLength(2);
    cells.forEach((cell) => {
      expect((cell as HTMLElement).style.backgroundColor).toBeTruthy();
      expect((cell as HTMLElement).style.borderWidth).toBe("1px");
      expect((cell as HTMLElement).style.borderStyle).toBe("solid");
    });
  });

  test("maps bgcolor to background-color", () => {
    const out = flattenPastedTableStyles(
      `<table bgcolor="#ffcc00"><tr><td>x</td></tr></table>`
    );
    const cell = parseBody(out).querySelector("td") as HTMLElement;
    expect(cell.style.backgroundColor).toBeTruthy();
  });

  test("copies col width onto cells", () => {
    const out = flattenPastedTableStyles(
      `<table><colgroup><col width="120"><col width="80"></colgroup><tr><td>a</td><td>b</td></tr></table>`
    );
    const cells = parseBody(out).querySelectorAll("td");
    expect((cells[0] as HTMLElement).style.width).toBe("120px");
    expect(cells[0].getAttribute("data-colwidth")).toBe("120");
    expect((cells[1] as HTMLElement).style.width).toBe("80px");
  });

  test("does not overwrite a cell that already has a background", () => {
    const out = flattenPastedTableStyles(
      `<table style="background-color:#eee"><tr><td style="background-color:#111">a</td></tr></table>`
    );
    const cell = parseBody(out).querySelector("td") as HTMLElement;
    expect(cell.style.backgroundColor).toMatch(/rgb\(17,\s*17,\s*17\)|#111/i);
  });

  test("drops url backgrounds", () => {
    const out = flattenPastedTableStyles(
      `<table style="background:url(https://evil.example/x.png)"><tr><td>a</td></tr></table>`
    );
    const cell = parseBody(out).querySelector("td") as HTMLElement;
    expect(cell.style.backgroundImage).toBe("");
    expect(cell.style.backgroundColor).toBe("");
  });

  test("leaves non-table html unchanged", () => {
    expect(flattenPastedTableStyles("<p>hello</p>")).toBe("<p>hello</p>");
  });
});

describe("table cell parse helpers", () => {
  const el = (cellHtml: string) =>
    parseBody(`<table><tr>${cellHtml}</tr></table>`).querySelector(
      "td"
    ) as HTMLElement;

  test("readCellBackground reads bgcolor", () => {
    expect(readCellBackground(el(`<td bgcolor="#abc">x</td>`))).toBe("#abc");
  });

  test("parseBorderShorthand reads width style color", () => {
    expect(parseBorderShorthand("2px dashed #444")).toEqual({
      borderWidth: "2px",
      borderStyle: "dashed",
      borderColor: "#444",
    });
  });

  test("readCellBorder reads shorthand on the element", () => {
    const cell = el(`<td style="border:1px solid #ccc">x</td>`);
    expect(readCellBorder(cell)).toEqual({
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "#ccc",
    });
  });

  test("parsePaddingPx clamps and rejects bad values", () => {
    expect(parsePaddingPx("8px")).toBe("8px");
    expect(parsePaddingPx("99px")).toBeNull();
    expect(parsePaddingPx("url(x)")).toBeNull();
  });
});
