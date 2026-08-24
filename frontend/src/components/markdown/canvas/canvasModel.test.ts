import {
  attrsFromPayload,
  buildCanvasSrcDoc,
  canvasByteSize,
  CANVAS_MAX_BYTES,
  emptyCanvasPayload,
  isCompleteHtmlDocument,
  isLegacyHtmlApp,
  parseCanvasContent,
  parseFenceLanguage,
  payloadFromAttrs,
  preserveInteractiveFences,
  repairCanvasMarkdown,
  restoreInteractiveFences,
  serializeCanvasFence,
  serializeCanvasPayload,
  serializeCodeEmbed,
  shouldSerializeAsCanvas,
  srcDocFromCodeAttrs,
} from "./canvasModel";

describe("canvasModel", () => {
  test("assembles html, css, and javascript into srcdoc", () => {
    const src = buildCanvasSrcDoc({
      v: 1,
      title: "데모",
      html: "<p id='n'>hi</p>",
      css: "p { color: red; }",
      javascript: "document.getElementById('n').textContent='ok';",
    });
    expect(src).toContain("<!DOCTYPE html>");
    expect(src).toContain("<p id='n'>hi</p>");
    expect(src).toContain("p { color: red; }");
    expect(src).toContain("document.getElementById('n').textContent='ok';");
    expect(src).toContain("<title>데모</title>");
  });

  test("passes through a complete legacy HTML document when css/js are empty", () => {
    const html = "<!DOCTYPE html><html><body><h1>old</h1></body></html>";
    expect(isCompleteHtmlDocument(html)).toBe(true);
    expect(
      buildCanvasSrcDoc({ v: 1, html, css: "", javascript: "" })
    ).toBe(html);
  });

  test("wraps a fragment even if it is legacy html-app", () => {
    const src = buildCanvasSrcDoc({
      v: 1,
      html: "<div>조각</div>",
      css: "",
      javascript: "",
    });
    expect(src).toContain("<!DOCTYPE html>");
    expect(src).toContain("<div>조각</div>");
  });

  test("escapes closing script/style tags in user code", () => {
    const src = buildCanvasSrcDoc({
      v: 1,
      html: "<div></div>",
      css: "/* </style> */",
      javascript: "const x = '</script>';",
    });
    expect(src).toContain("<\\/style");
    expect(src).toContain("<\\/script");
    expect(src).not.toContain("/* </style> */");
    expect(src).not.toContain("const x = '</script>';");
  });

  test("parses canvas JSON and treats raw HTML as legacy", () => {
    const payload = {
      v: 1 as const,
      title: "탐험",
      html: "<div>a</div>",
      css: "div{color:blue}",
      javascript: "1+1",
    };
    const json = serializeCanvasPayload(payload);
    expect(parseCanvasContent(json)).toEqual(payload);
    expect(isLegacyHtmlApp(json)).toBe(false);

    const legacy = "<div>hello</div>";
    expect(isLegacyHtmlApp(legacy)).toBe(true);
    expect(parseCanvasContent(legacy)).toEqual({
      v: 1,
      html: legacy,
      css: "",
      javascript: "",
    });
  });

  test("falls back when JSON is invalid or not a canvas shape", () => {
    expect(parseCanvasContent("{not-json")).toEqual({
      v: 1,
      html: "{not-json",
      css: "",
      javascript: "",
    });
    expect(parseCanvasContent('{"foo":1}')).toEqual({
      v: 1,
      html: '{"foo":1}',
      css: "",
      javascript: "",
    });
    expect(parseCanvasContent("")).toEqual({
      v: 1,
      html: "",
      css: "",
      javascript: "",
    });
  });

  test("accepts js alias and ignores non-string fields", () => {
    expect(parseCanvasContent('{"v":1,"html":"<p>","js":"alert(1)"}')).toEqual({
      v: 1,
      html: "<p>",
      css: "",
      javascript: "alert(1)",
    });
  });

  test("serializes canvas fence when css/js/title exist, else html-app", () => {
    const withCss = {
      v: 1 as const,
      html: "<div/>",
      css: "div{}",
      javascript: "",
    };
    expect(shouldSerializeAsCanvas(withCss)).toBe(true);
    expect(serializeCodeEmbed(withCss, 500)).toBe(
      "```canvas:500\n" + serializeCanvasPayload(withCss) + "\n```"
    );
    expect(serializeCanvasFence(withCss, 0)).toContain("```canvas\n");

    const legacyOnly = { v: 1 as const, html: "<div/>", css: "", javascript: "" };
    expect(shouldSerializeAsCanvas(legacyOnly)).toBe(false);
    expect(serializeCodeEmbed(legacyOnly, 300)).toBe(
      "```html-app:300\n<div/>\n```"
    );
  });

  test("round-trips attrs and reports assembled size", () => {
    const payload = emptyCanvasPayload("첫 캔버스");
    expect(payload.html).toBe("");
    expect(payload.css).toBe("");
    expect(payload.javascript).toBe("");
    const attrs = attrsFromPayload(payload, 500);
    expect(attrs.embedType).toBe("code");
    expect(attrs.height).toBe(500);
    expect(attrs.title).toBe("첫 캔버스");
    expect(payloadFromAttrs(attrs)).toEqual(payload);

    const src = srcDocFromCodeAttrs(attrs);
    const size = canvasByteSize(src);
    expect(src).toContain("<!DOCTYPE html>");
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(CANVAS_MAX_BYTES);
    expect(canvasByteSize("")).toBe(0);
  });

  test("empty canvas without title is saveable", () => {
    const payload = emptyCanvasPayload();
    expect(payload).toEqual({
      v: 1,
      html: "",
      css: "",
      javascript: "",
    });
    expect(shouldSerializeAsCanvas(payload)).toBe(false);
    expect(serializeCodeEmbed(payload, 500)).toBe("```html-app:500\n\n```");
    expect(canvasByteSize(buildCanvasSrcDoc(payload))).toBeLessThan(
      CANVAS_MAX_BYTES
    );
  });

  test("payloadFromAttrs reads legacy content when split fields are empty", () => {
    expect(
      payloadFromAttrs({ content: "<section>old</section>" })
    ).toEqual({
      v: 1,
      html: "<section>old</section>",
      css: "",
      javascript: "",
    });
  });

  test("preserves html-app and canvas fences with height suffix", () => {
    const content = [
      "# 제목",
      "```html-app:400",
      "<script>1</script>",
      "```",
      "중간",
      "```canvas",
      '{"v":1,"html":"<div/>","css":"","javascript":""}',
      "```",
    ].join("\n");
    const { withPlaceholders, preserved } = preserveInteractiveFences(content);
    expect(preserved).toHaveLength(2);
    expect(preserved[0]).toContain("html-app:400");
    expect(preserved[1]).toContain("```canvas");
    expect(withPlaceholders).toContain("__HTMLAPP_PRESERVE_0__");
    expect(withPlaceholders).toContain("__HTMLAPP_PRESERVE_1__");
    expect(withPlaceholders).not.toContain("<script>");
    expect(restoreInteractiveFences(withPlaceholders, preserved)).toBe(content);
  });

  test("does not put canvas JSON into srcdoc", () => {
    const payload = {
      v: 1 as const,
      title: "HTML로 만든 타이머 화면",
      html: "<!DOCTYPE html>\n<html><body><h1>타이머</h1></body></html>",
      css: "",
      javascript: "",
    };
    const json = serializeCanvasPayload(payload);
    const fromJson = parseCanvasContent(json);
    expect(fromJson.html).toBe(payload.html);
    const src = buildCanvasSrcDoc(fromJson);
    expect(src).not.toContain('{"v":1');
    expect(src).toContain("<h1>타이머</h1>");

    const fromFence = parseCanvasContent(serializeCanvasFence(payload));
    expect(fromFence.html).toBe(payload.html);
    expect(buildCanvasSrcDoc(fromFence)).not.toContain('{"v":1');
  });

  test("unwraps canvas JSON stored in the html field", () => {
    const inner = {
      v: 1 as const,
      title: "타이머",
      html: "<!DOCTYPE html><html><body><h1>타이머</h1></body></html>",
      css: "",
      javascript: "",
    };
    const json = serializeCanvasPayload(inner);
    const doubled = serializeCanvasPayload({
      v: 1,
      html: json,
      css: "",
      javascript: "",
      title: inner.title,
    });
    expect(parseCanvasContent(doubled).html).toBe(inner.html);
    expect(buildCanvasSrcDoc(parseCanvasContent(doubled))).not.toContain(
      '{"v":1'
    );
    expect(
      payloadFromAttrs({ html: json, css: "", javascript: "" }).html
    ).toBe(inner.html);
  });

  test("repairCanvasMarkdown restores leaked and sliced canvas JSON", () => {
    const payload = {
      v: 1 as const,
      title: "HTML로 만든 타이머 화면",
      html: "<!DOCTYPE html><html><body><h1>타이머</h1></body></html>",
      css: "",
      javascript: "",
    };
    const json = serializeCanvasPayload(payload);
    const repairedBare = repairCanvasMarkdown(`${json}\n\`\`\``);
    expect(repairedBare).toContain("```canvas");
    expect(parseCanvasContent(repairedBare).html).toBe(payload.html);

    const sliced = [
      '{"v":1,"html":"',
      "```html-app",
      "<!DOCTYPE html><html><body><h1>타이머</h1></body></html>",
      '","css":"","javascript":"","title":"HTML로 만든 타이머 화면"}',
      "```",
    ].join("\n");
    const repairedSliced = repairCanvasMarkdown(sliced);
    expect(repairedSliced.trim().startsWith("```")).toBe(true);
    expect(parseCanvasContent(repairedSliced).html).toContain("<h1>타이머</h1>");
    expect(buildCanvasSrcDoc(parseCanvasContent(repairedSliced))).not.toContain(
      '{"v":1'
    );
  });

  test("preserves canvas fences that use CRLF after the language", () => {
    const json = '{"v":1,"html":"<div/>","css":"","javascript":""}';
    const content = "```canvas\r\n" + json + "\r\n```";
    const { preserved, withPlaceholders } = preserveInteractiveFences(content);
    expect(preserved).toHaveLength(1);
    expect(withPlaceholders).toContain("__HTMLAPP_PRESERVE_0__");
    expect(withPlaceholders).not.toContain("<div/>");
  });

  test("parseFenceLanguage reads html-app and canvas", () => {
    expect(parseFenceLanguage("language-html-app")).toEqual({
      kind: "html-app",
    });
    expect(parseFenceLanguage("language-html-app:700")).toEqual({
      kind: "html-app",
      height: 700,
    });
    expect(parseFenceLanguage("language-canvas:500")).toEqual({
      kind: "canvas",
      height: 500,
    });
    expect(parseFenceLanguage("language-js")).toBeNull();
  });
});
