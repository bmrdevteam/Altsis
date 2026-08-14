import { sanitizeMarkdownInlineStyle } from "./sanitizeMarkdownInlineStyle";

describe("sanitizeMarkdownInlineStyle", () => {
  test("keeps text-align:center on p and h1", () => {
    expect(sanitizeMarkdownInlineStyle("p", "text-align: center")).toBe(
      "text-align: center"
    );
    expect(sanitizeMarkdownInlineStyle("h1", "text-align:center")).toBe(
      "text-align: center"
    );
  });

  test("keeps margin: 0 auto on div", () => {
    expect(sanitizeMarkdownInlineStyle("div", "margin: 0 auto")).toBe(
      "margin: 0 auto"
    );
    expect(
      sanitizeMarkdownInlineStyle("div", "width: 640px; margin: 0 auto")
    ).toBe("width: 640px; margin: 0 auto");
  });

  test("drops position and background url on p", () => {
    expect(
      sanitizeMarkdownInlineStyle(
        "p",
        "text-align: center; position: fixed; background: url(https://evil.example/x.png)"
      )
    ).toBe("text-align: center");
  });

  test("keeps table cell border and background-color", () => {
    expect(
      sanitizeMarkdownInlineStyle(
        "td",
        "border: 1px solid #ccc; background-color: #fff; vertical-align: top"
      )
    ).toBe(
      "border: 1px solid #ccc; background-color: #fff; vertical-align: top"
    );
  });

  test("drops styles on disallowed tags", () => {
    expect(
      sanitizeMarkdownInlineStyle("script", "text-align: center")
    ).toBe("");
    expect(sanitizeMarkdownInlineStyle("body", "margin: 0 auto")).toBe("");
  });
});
