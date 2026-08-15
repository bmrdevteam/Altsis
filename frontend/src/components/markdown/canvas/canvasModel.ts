/** 인라인 캔버스 최대 용량 (조립된 srcdoc 기준) */
export const CANVAS_MAX_BYTES = 100 * 1024;

/** 코드 캔버스 iframe sandbox. same-origin을 넣지 않아 부모 페이지와 격리한다. */
export const CANVAS_IFRAME_SANDBOX = "allow-scripts";

export const DEFAULT_CANVAS_HEIGHT = 500;

export type CanvasPayload = {
  v: 1;
  title?: string;
  html: string;
  css: string;
  javascript: string;
};

export type HtmlEmbedCodeAttrs = {
  embedType: "code";
  height: number;
  title?: string;
  html: string;
  css: string;
  javascript: string;
  content: string;
};

const INTERACTIVE_FENCE_RE =
  /```(?:html-app|canvas)(?::\d+)?\n[\s\S]*?```/g;

export function emptyCanvasPayload(title = ""): CanvasPayload {
  return {
    v: 1,
    ...(title ? { title } : {}),
    html: "",
    css: "",
    javascript: "",
  };
}

export function isCompleteHtmlDocument(html: string): boolean {
  return /<!DOCTYPE\s+html/i.test(html) || /<html[\s>]/i.test(html);
}

/** 유효한 canvas JSON이 아니면 레거시 html-app 본문으로 본다. */
export function isLegacyHtmlApp(text: string): boolean {
  return parseCanvasJson(text) == null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseCanvasJson(text: string): CanvasPayload | null {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const hasCanvasShape =
      parsed.v === 1 ||
      "html" in parsed ||
      "css" in parsed ||
      "javascript" in parsed ||
      "js" in parsed;
    if (!hasCanvasShape) return null;
    const title = asString(parsed.title).trim();
    return {
      v: 1,
      ...(title ? { title } : {}),
      html: asString(parsed.html),
      css: asString(parsed.css),
      javascript: asString(parsed.javascript || parsed.js),
    };
  } catch {
    return null;
  }
}

/** ```canvas``` JSON 또는 레거시 ```html-app``` 원본 HTML을 payload로 변환 */
export function parseCanvasContent(text: string): CanvasPayload {
  return (
    parseCanvasJson(text) ?? {
      v: 1,
      html: String(text ?? ""),
      css: "",
      javascript: "",
    }
  );
}

export function serializeCanvasPayload(payload: CanvasPayload): string {
  const body: CanvasPayload = {
    v: 1,
    html: payload.html || "",
    css: payload.css || "",
    javascript: payload.javascript || "",
  };
  const title = payload.title?.trim();
  if (title) body.title = title;
  return JSON.stringify(body);
}

export function shouldSerializeAsCanvas(payload: CanvasPayload): boolean {
  return Boolean(
    payload.title?.trim() ||
      payload.css.trim() ||
      payload.javascript.trim()
  );
}

function heightSuffix(height: number): string {
  return height > 0 ? `:${height}` : "";
}

export function serializeCanvasFence(
  payload: CanvasPayload,
  height = 0
): string {
  return `\`\`\`canvas${heightSuffix(height)}\n${serializeCanvasPayload(payload)}\n\`\`\``;
}

export function serializeHtmlAppFence(html: string, height = 0): string {
  return `\`\`\`html-app${heightSuffix(height)}\n${html}\n\`\`\``;
}

export function serializeCodeEmbed(
  payload: CanvasPayload,
  height = 0
): string {
  if (shouldSerializeAsCanvas(payload)) {
    return serializeCanvasFence(payload, height);
  }
  return serializeHtmlAppFence(payload.html, height);
}

function escapeClosingTag(source: string, tag: string): string {
  const re = new RegExp(`</${tag}`, "gi");
  return source.replace(re, `<\\/${tag}`);
}

/**
 * HTML/CSS/JS를 iframe srcdoc으로 조립한다.
 * 레거시 전체 HTML 문서(css/js 없음)는 그대로 쓴다.
 */
export function buildCanvasSrcDoc(payload: CanvasPayload): string {
  const html = payload.html || "";
  const css = payload.css || "";
  const javascript = payload.javascript || "";

  if (!css.trim() && !javascript.trim() && isCompleteHtmlDocument(html)) {
    return html;
  }

  const safeCss = escapeClosingTag(css, "style");
  const safeJs = escapeClosingTag(javascript, "script");
  const title = payload.title?.trim() || "캔버스";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtmlText(title)}</title>
<style>${safeCss}</style>
</head>
<body>
${html}
${safeJs ? `<script>${safeJs}<\/script>` : ""}
</body>
</html>`;
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function canvasByteSize(srcDoc: string): number {
  return new Blob([srcDoc]).size;
}

export function payloadFromAttrs(attrs: {
  title?: string;
  html?: string;
  css?: string;
  javascript?: string;
  content?: string;
}): CanvasPayload {
  const hasSplit =
    attrs.html != null || attrs.css != null || attrs.javascript != null;
  if (hasSplit) {
    const html = attrs.html ?? "";
    const css = attrs.css ?? "";
    const javascript = attrs.javascript ?? "";
    const title = attrs.title?.trim();
    if (html || css || javascript || title) {
      return {
        v: 1,
        ...(title ? { title } : {}),
        html,
        css,
        javascript,
      };
    }
  }
  return parseCanvasContent(attrs.content || "");
}

export function srcDocFromCodeAttrs(attrs: {
  title?: string;
  html?: string;
  css?: string;
  javascript?: string;
  content?: string;
}): string {
  return buildCanvasSrcDoc(payloadFromAttrs(attrs));
}

export function attrsFromPayload(
  payload: CanvasPayload,
  height = 0
): HtmlEmbedCodeAttrs {
  const title = payload.title?.trim();
  return {
    embedType: "code",
    height,
    ...(title ? { title } : {}),
    html: payload.html || "",
    css: payload.css || "",
    javascript: payload.javascript || "",
    content: shouldSerializeAsCanvas(payload)
      ? serializeCanvasPayload(payload)
      : payload.html || "",
  };
}

/** DOMPurify 전에 인터랙티브 펜스를 빼 두기 위한 치환 */
export function preserveInteractiveFences(content: string): {
  withPlaceholders: string;
  preserved: string[];
} {
  const preserved: string[] = [];
  const withPlaceholders = content.replace(INTERACTIVE_FENCE_RE, (match) => {
    preserved.push(match);
    return `__HTMLAPP_PRESERVE_${preserved.length - 1}__`;
  });
  return { withPlaceholders, preserved };
}

export function restoreInteractiveFences(
  sanitized: string,
  preserved: string[]
): string {
  return preserved.reduce(
    (acc, block, i) => acc.replace(`__HTMLAPP_PRESERVE_${i}__`, block),
    sanitized
  );
}

export function parseFenceLanguage(
  className?: string
): { kind: "html-app" | "canvas"; height?: number } | null {
  const match = /language-(html-app|canvas)(?::(\d+))?/.exec(className || "");
  if (!match) return null;
  const height = match[2] ? parseInt(match[2], 10) : undefined;
  return {
    kind: match[1] as "html-app" | "canvas",
    ...(height ? { height } : {}),
  };
}
