const STYLE_TAGS = new Set([
  "td",
  "th",
  "table",
  "tr",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "span",
  "figure",
  "img",
  "blockquote",
  "li",
]);

const MARGIN_TOKEN = /^(auto|0|-?\d+(\.\d+)?(px|em|rem|%|pt|ex|ch|cm|mm|in)?)$/i;
const SIZE_TOKEN =
  /^(auto|fit-content|0|-?\d+(\.\d+)?(px|em|rem|%|pt|ex|ch|cm|mm|in)?)$/i;
const TEXT_ALIGN = /^(left|center|right|justify)$/i;
const DISPLAY = /^(block|inline|inline-block)$/i;
const BORDER_PROP = /^border(-[a-z]+)?$/i;

const hasUnsafeValue = (value: string): boolean => {
  const v = value.toLowerCase();
  return (
    v.includes("url(") ||
    v.includes("expression(") ||
    v.includes("javascript:") ||
    v.includes("behavior:")
  );
};

const keepColorLike = (value: string): boolean =>
  !hasUnsafeValue(value) && value.length <= 80;

/**
 * MarkdownViewer DOMPurify style 훅용.
 * 레이아웃(가운데 정렬)만 허용하고 url/position 등은 버린다.
 */
export const sanitizeMarkdownInlineStyle = (
  tag: string,
  css: string
): string => {
  if (!STYLE_TAGS.has(String(tag || "").toLowerCase())) return "";
  const kept: string[] = [];
  for (const raw of String(css || "").split(";")) {
    const part = raw.trim();
    if (!part) continue;
    const colon = part.indexOf(":");
    if (colon < 0) continue;
    const prop = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (!prop || !value || hasUnsafeValue(value)) continue;

    if (prop === "background-color" || prop === "color") {
      if (keepColorLike(value)) kept.push(`${prop}: ${value}`);
      continue;
    }
    if (prop === "vertical-align") {
      kept.push(`${prop}: ${value}`);
      continue;
    }
    if (BORDER_PROP.test(prop)) {
      kept.push(`${prop}: ${value}`);
      continue;
    }
    if (prop === "text-align") {
      if (TEXT_ALIGN.test(value)) kept.push(`${prop}: ${value}`);
      continue;
    }
    if (prop === "margin" || prop.startsWith("margin-")) {
      const tokens = value.split(/\s+/);
      if (tokens.length > 0 && tokens.length <= 4 && tokens.every((t) => MARGIN_TOKEN.test(t))) {
        kept.push(`${prop}: ${value}`);
      }
      continue;
    }
    if (prop === "width" || prop === "max-width") {
      if (SIZE_TOKEN.test(value)) kept.push(`${prop}: ${value}`);
      continue;
    }
    if (prop === "display" && DISPLAY.test(value)) {
      kept.push(`${prop}: ${value}`);
    }
  }
  return kept.join("; ");
};
