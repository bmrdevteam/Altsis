import {
  normalizeDocumentDraftContent,
  parseDocumentDraftResponse,
} from "../../src/services/aiSkills.js";

describe("parseDocumentDraftResponse", () => {
  it("keeps html-app fences inside CONTENT", () => {
    const text = `<<<TITLE>>>
퀴즈
<<<CONTENT>>>
# 퀴즈

\`\`\`html-app
<div id="quiz">ok</div>
<script>console.log(1)</script>
\`\`\`
<<<END>>>`;
    const parsed = parseDocumentDraftResponse(text);
    expect(parsed.title).toBe("퀴즈");
    expect(parsed.content).toContain("```html-app");
    expect(parsed.content).toContain('<div id="quiz">ok</div>');
    expect(parsed.content).toContain("<script>console.log(1)</script>");
    expect(parsed.content).toContain("```");
  });

  it("does not strip ordinary code fences", () => {
    const text = `<<<TITLE>>>
예제
<<<CONTENT>>>
\`\`\`js
console.log("hi")
\`\`\`
<<<END>>>`;
    const parsed = parseDocumentDraftResponse(text);
    expect(parsed.content).toContain("```js");
    expect(parsed.content).toContain('console.log("hi")');
  });

  it("unwraps only an outer markdown fence around the whole response", () => {
    const text = `\`\`\`markdown
<<<TITLE>>>
제목
<<<CONTENT>>>
본문
<<<END>>>
\`\`\``;
    const parsed = parseDocumentDraftResponse(text);
    expect(parsed.title).toBe("제목");
    expect(parsed.content).toBe("본문");
  });
});

describe("normalizeDocumentDraftContent", () => {
  it("wraps raw interactive HTML into html-app", () => {
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

  it("leaves content that already has html-app alone", () => {
    const raw = "```html-app\n<div>a</div>\n```";
    expect(normalizeDocumentDraftContent(raw)).toBe(raw);
  });

  it("does not split canvas JSON at doctype inside the html field", () => {
    const json =
      '{"v":1,"html":"<!DOCTYPE html><html><body><h1>타이머</h1></body></html>","css":"","javascript":"","title":"HTML로 만든 타이머 화면"}';
    expect(normalizeDocumentDraftContent(json)).toBe(json);

    const fenced = "```canvas\n" + json + "\n```";
    expect(normalizeDocumentDraftContent(fenced)).toBe(fenced);
  });
});
