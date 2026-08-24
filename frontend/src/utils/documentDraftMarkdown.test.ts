import { normalizeDocumentDraftContent } from "./documentDraftMarkdown";

describe("normalizeDocumentDraftContent", () => {
  test("wraps raw interactive HTML into html-app", () => {
    const raw = `# 안내

<style>.x{}</style>
<div id="quiz-app"><h3>퀴즈</h3></div>
<script>function checkAnswer(){}</script>`;
    const out = normalizeDocumentDraftContent(raw);
    expect(out.startsWith("# 안내")).toBe(true);
    expect(out).toContain("```html-app");
    expect(out).toContain('<div id="quiz-app">');
    expect(out.trim().endsWith("```")).toBe(true);
  });

  test("leaves html-app fences alone", () => {
    const raw = "```html-app\n<div>a</div>\n```";
    expect(normalizeDocumentDraftContent(raw)).toBe(raw);
  });

  test("does not split canvas JSON at doctype inside the html field", () => {
    const json =
      '{"v":1,"html":"<!DOCTYPE html><html><body><h1>타이머</h1></body></html>","css":"","javascript":"","title":"HTML로 만든 타이머 화면"}';
    expect(normalizeDocumentDraftContent(json)).toBe(json);

    const fenced = "```canvas\n" + json + "\n```";
    expect(normalizeDocumentDraftContent(fenced)).toBe(fenced);
  });
});
