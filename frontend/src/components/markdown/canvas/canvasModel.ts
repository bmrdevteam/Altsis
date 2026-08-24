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
  /```(?:html-app|canvas)(?::\d+)?[ \t]*\r?\n[\s\S]*?```/g;

const INTERACTIVE_FENCE_BLOCK_RE =
  /```(html-app|canvas)(?::(\d+))?[ \t]*\r?\n([\s\S]*?)```/g;

const CANVAS_JSON_START_RE = /\{\s*"(?:v|html)"\s*:/;

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

function unescapeJsonStringFragment(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

/** HTML 본문: JSON 이스케이프 줄바꿈만 풀어 실제 태그의 따옴표는 유지 */
function unescapeHtmlField(raw: string): string {
  return raw.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
}

function stripInnerInteractiveFence(html: string): string {
  return html
    .trim()
    .replace(/^```(?:html-app|canvas)(?::\d+)?[ \t]*\r?\n?/, "")
    .replace(/\r?\n```[ \t]*$/, "")
    .trim();
}

function objectToPayload(parsed: Record<string, unknown>): CanvasPayload | null {
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
}

function parseRawCanvasObject(text: string): CanvasPayload | null {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    return objectToPayload(JSON.parse(trimmed) as Record<string, unknown>);
  } catch {
    return null;
  }
}

function stripOuterInteractiveFence(text: string): string {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(
    /^```(?:html-app|canvas)(?::\d+)?[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/
  );
  if (fenced) return fenced[1].trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("```")) {
    return trimmed.replace(/\n?```[ \t]*$/, "").trim();
  }
  return trimmed;
}

/** JSON.stringify가 깨져 태그가 노출된 canvas 포장을 복구 */
function tryParseLeakedCanvas(text: string): CanvasPayload | null {
  const src = String(text || "").trim();
  const htmlKey = src.search(/"html"\s*:\s*"/);
  if (htmlKey < 0) return null;
  const brace = src.indexOf("{");
  if (brace < 0 || brace > htmlKey) return null;

  const htmlToken = src.slice(htmlKey).match(/"html"\s*:\s*"/);
  if (!htmlToken) return null;
  const htmlValueStart = htmlKey + htmlToken[0].length;

  const tailRe =
    /"\s*,\s*"css"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"(?:javascript|js)"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"title"\s*:\s*"((?:\\.|[^"\\])*)")?\s*\}\s*(?:```)?\s*$/;
  const tailMatch = src.match(tailRe);
  if (!tailMatch || tailMatch.index == null) return null;
  if (tailMatch.index < htmlValueStart) return null;

  let html = unescapeHtmlField(src.slice(htmlValueStart, tailMatch.index));
  html = stripInnerInteractiveFence(html);
  const title = tailMatch[3] ? unescapeJsonStringFragment(tailMatch[3]).trim() : "";
  return {
    v: 1,
    ...(title ? { title } : {}),
    html,
    css: unescapeJsonStringFragment(tailMatch[1]),
    javascript: unescapeJsonStringFragment(tailMatch[2]),
  };
}

function unwrapNestedCanvasHtml(payload: CanvasPayload): CanvasPayload {
  let current = payload;
  for (let i = 0; i < 3; i += 1) {
    const inner =
      parseRawCanvasObject(current.html) || tryParseLeakedCanvas(current.html);
    if (!inner) break;
    const title = current.title || inner.title;
    current = {
      v: 1,
      ...(title ? { title } : {}),
      html: inner.html,
      css: current.css.trim() ? current.css : inner.css,
      javascript: current.javascript.trim()
        ? current.javascript
        : inner.javascript,
    };
  }
  return current;
}

function parseCanvasJson(text: string): CanvasPayload | null {
  const prepared = stripOuterInteractiveFence(text);
  if (!prepared.startsWith("{") && !CANVAS_JSON_START_RE.test(prepared)) {
    return tryParseLeakedCanvas(prepared);
  }
  const jsonText = prepared.startsWith("{")
    ? prepared
    : prepared.slice(prepared.search(CANVAS_JSON_START_RE));
  const parsed =
    parseRawCanvasObject(jsonText) ||
    (() => {
      const start = jsonText.indexOf("{");
      const end = jsonText.lastIndexOf("}");
      if (start < 0 || end <= start) return null;
      return parseRawCanvasObject(jsonText.slice(start, end + 1));
    })();
  if (parsed) return unwrapNestedCanvasHtml(parsed);
  return tryParseLeakedCanvas(prepared) || tryParseLeakedCanvas(jsonText);
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

/**
 * 조회 전에 새어 나온 canvas JSON·잘린 포장을 정상 펜스로 되돌린다.
 */
export function repairCanvasMarkdown(content: string): string {
  const text = String(content ?? "");
  if (!text.trim()) return text;

  const repairedFences = text.replace(
    new RegExp(INTERACTIVE_FENCE_BLOCK_RE.source, "g"),
    (full, _kind, heightStr, body) => {
      const height = heightStr ? parseInt(heightStr, 10) : 0;
      const parsed = parseCanvasJson(body);
      if (!parsed) return full;
      return serializeCodeEmbed(parsed, height || 0);
    }
  );

  const trimmed = repairedFences.trim();
  const hasInteractiveFence = /```(?:html-app|canvas)(?::\d+)?\b/.test(
    repairedFences
  );

  // 앞 문단 + 이미 펜스된 캔버스는 그대로 둔다.
  if (hasInteractiveFence && !trimmed.startsWith("{")) {
    return repairedFences;
  }

  // 문서 전체가 펜스 없는 JSON(끝 ``` 허용)일 때만 통째 교체
  if (trimmed.startsWith("{")) {
    const whole = parseCanvasJson(trimmed);
    if (whole) {
      return serializeCodeEmbed(whole);
    }
  }

  if (hasInteractiveFence) {
    return repairedFences;
  }

  const jsonStart = repairedFences.search(CANVAS_JSON_START_RE);
  if (jsonStart >= 0) {
    const slice = repairedFences.slice(jsonStart);
    const embedded = parseCanvasJson(slice);
    if (embedded) {
      const before = repairedFences.slice(0, jsonStart).trimEnd();
      const fenced = serializeCodeEmbed(embedded);
      return before ? `${before}\n\n${fenced}` : fenced;
    }
  }

  return repairedFences;
}

function looksLikeCanvasJsonText(html: string): boolean {
  const trimmed = html.trim();
  return trimmed.startsWith("{") && /"html"\s*:/.test(trimmed);
}

function resolveCanvasPayload(payload: CanvasPayload): CanvasPayload {
  const fromHtml =
    parseCanvasJson(payload.html) || tryParseLeakedCanvas(payload.html);
  if (!fromHtml) return payload;
  const title = payload.title || fromHtml.title;
  return {
    v: 1,
    ...(title ? { title } : {}),
    html: fromHtml.html,
    css: payload.css.trim() ? payload.css : fromHtml.css,
    javascript: payload.javascript.trim()
      ? payload.javascript
      : fromHtml.javascript,
  };
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
  const resolved = resolveCanvasPayload(payload);
  const html = resolved.html || "";
  const css = resolved.css || "";
  const javascript = resolved.javascript || "";

  if (
    !css.trim() &&
    !javascript.trim() &&
    isCompleteHtmlDocument(html) &&
    !looksLikeCanvasJsonText(html)
  ) {
    return html;
  }

  const safeCss = escapeClosingTag(css, "style");
  const safeJs = escapeClosingTag(javascript, "script");
  const title = resolved.title?.trim() || "캔버스";

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
      const fromHtml = parseCanvasJson(html) || tryParseLeakedCanvas(html);
      if (fromHtml) {
        const resolvedTitle = title || fromHtml.title;
        return {
          v: 1,
          ...(resolvedTitle ? { title: resolvedTitle } : {}),
          html: fromHtml.html,
          css: css.trim() ? css : fromHtml.css,
          javascript: javascript.trim() ? javascript : fromHtml.javascript,
        };
      }
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
