import {
  escapeHtmlTags,
  preserveMarkdownCode,
  restoreMarkdownCode,
} from "./preserveMarkdownCode";
import { preprocessMarkdownForViewer } from "./preprocessMarkdownForViewer";
import normalizeAlterMarkdown from "utils/normalizeAlterMarkdown";

describe("preserveMarkdownCode", () => {
  test("round-trips inline HTML tags in backticks", () => {
    const src = '설명 `` `<a href="https://www.naver.com">` `` 과 `</a>`';
    const { withPlaceholders, preserved } = preserveMarkdownCode(src);
    expect(withPlaceholders).not.toContain("<a");
    expect(withPlaceholders).not.toContain("</a>");
    expect(restoreMarkdownCode(withPlaceholders, preserved)).toBe(src);
  });

  test("round-trips an html fence", () => {
    const src = [
      "```html",
      '<a href="https://www.naver.com">네이버로 이동하기</a>',
      "```",
    ].join("\n");
    const { withPlaceholders, preserved } = preserveMarkdownCode(src);
    expect(withPlaceholders).not.toContain("<a href");
    expect(restoreMarkdownCode(withPlaceholders, preserved)).toBe(src);
  });

  test("leaves empty string and unmatched backticks alone", () => {
    expect(preserveMarkdownCode("").withPlaceholders).toBe("");
    const open = "코드 `닫히지 않음";
    const { withPlaceholders, preserved } = preserveMarkdownCode(open);
    expect(restoreMarkdownCode(withPlaceholders, preserved)).toBe(open);
  });
});

describe("escapeHtmlTags", () => {
  test("escapes anchors but keeps strong", () => {
    const src =
      '<strong>굵게</strong> <a href="https://www.naver.com">네이버</a>';
    const out = escapeHtmlTags(src);
    expect(out).toContain("<strong>굵게</strong>");
    expect(out).toContain("&lt;a href=\"https://www.naver.com\"&gt;");
    expect(out).toContain("&lt;/a&gt;");
    expect(out).not.toMatch(/<a\s/i);
  });

  test("does not escape callout blockquote markers", () => {
    const src = "> [!NOTE]\n> 안내입니다";
    expect(escapeHtmlTags(src)).toBe(src);
  });
});

describe("preprocessMarkdownForViewer", () => {
  test("keeps inline closing tags as code after strong wrap (screenshot)", () => {
    const src = [
      "```html",
      '<a href="https://www.naver.com">네이버로 이동하기</a>',
      "```",
      "",
      "- **`<a>`** : 링크를 만드는 태그",
      "- **`</a>`** : 링크가 끝났다는 표시",
    ].join("\n");
    const out = preprocessMarkdownForViewer(normalizeAlterMarkdown(src), {
      escapeRawHtml: true,
    });
    expect(out).toContain("`</a>`");
    expect(out).toContain("`<a>`");
    expect(out).not.toContain("</strong></a><strong>");
    expect(out).toContain('<a href="https://www.naver.com">네이버로 이동하기</a>');
  });

  test("escapes unfenced anchors when escapeRawHtml is on", () => {
    const out = preprocessMarkdownForViewer(
      '<a href="https://www.naver.com">네이버</a>',
      { escapeRawHtml: true }
    );
    expect(out).toContain("&lt;a href=");
    expect(out).not.toMatch(/<a\s/i);
  });

  test("keeps document HTML when escapeRawHtml is off", () => {
    const src = '<a href="https://www.naver.com">네이버</a>';
    const out = preprocessMarkdownForViewer(src);
    expect(out).toContain('<a href="https://www.naver.com">');
  });

  test("does not escape callout syntax before conversion", () => {
    const out = preprocessMarkdownForViewer("> [!NOTE]\n> 안내입니다", {
      escapeRawHtml: true,
    });
    expect(out).toContain('data-callout="NOTE"');
    expect(out).toContain("안내입니다");
  });

  test("preserves html-app fences through sanitizer", () => {
    const src = "```html-app\n<div id='app'>ok</div>\n```";
    const out = preprocessMarkdownForViewer(src, { escapeRawHtml: true });
    expect(out).toContain("```html-app");
    expect(out).toContain("<div id='app'>ok</div>");
  });

  test("drops raw iframe srcdoc and non-YouTube frames", () => {
    const out = preprocessMarkdownForViewer(
      [
        '<iframe srcdoc="<script>parent.fetch(&quot;/api/users&quot;)</script>"></iframe>',
        '<iframe src="/admin"></iframe>',
      ].join("\n")
    );
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("srcdoc");
  });

  test("keeps trusted YouTube iframe with a forced sandbox", () => {
    const out = preprocessMarkdownForViewer(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
    );
    expect(out).toContain(
      'src="https://www.youtube.com/embed/dQw4w9WgXcQ"'
    );
    expect(out).toContain(
      'sandbox="allow-scripts allow-same-origin allow-presentation"'
    );
    expect(out).toContain(
      'referrerpolicy="strict-origin-when-cross-origin"'
    );
  });
});
