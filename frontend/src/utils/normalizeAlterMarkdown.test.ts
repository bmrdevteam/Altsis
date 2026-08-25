import normalizeAlterMarkdown from "./normalizeAlterMarkdown";

describe("normalizeAlterMarkdown", () => {
  test("trims spaced emphasis into strong HTML", () => {
    expect(normalizeAlterMarkdown("** 텍스트 **")).toBe(
      "<strong>텍스트</strong>"
    );
  });

  test("wraps inline HTML tags in strong without splitting them", () => {
    const out = normalizeAlterMarkdown("- **`</a>`** : 링크가 끝났다는 표시");
    expect(out).toContain("<strong>`</a>`</strong>");
    expect(out).not.toContain("</strong></a><strong>");
  });

  test("leaves emphasis inside fenced code unchanged", () => {
    const src = ["```md", "** 텍스트 **", "```"].join("\n");
    expect(normalizeAlterMarkdown(src)).toBe(src);
  });
});
