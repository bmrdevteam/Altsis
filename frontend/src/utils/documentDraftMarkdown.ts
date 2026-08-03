/** 응답/초안을 감싼 ```markdown ... ``` 한 겹만 제거 */
const unwrapOuterMarkdownFence = (text: string) => {
  const t = String(text || "").trim();
  const m = t.match(/^```(?:markdown|md)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  return m ? m[1].trim() : t;
};

/**
 * TipTap 에디터가 HtmlEmbed로 변환할 수 있도록,
 * 펜스 없이 나온 인터랙티브 HTML을 ```html-app```으로 감싼다.
 */
export const normalizeDocumentDraftContent = (content: string): string => {
  const text = unwrapOuterMarkdownFence(content);
  if (!text.trim()) return text;
  if (/```html-app(?::\d+)?\b/.test(text)) return text;

  const looksLikeHtmlApp =
    /<script[\s>]/i.test(text) ||
    /<!DOCTYPE\s+html/i.test(text) ||
    /<html[\s>]/i.test(text) ||
    (/<style[\s>]/i.test(text) &&
      /<\/style>/i.test(text) &&
      /<(?:div|section|main|body)\b/i.test(text));
  if (!looksLikeHtmlApp) return text;

  const startMatch = text.match(
    /<(?:!DOCTYPE\s+html|html\b|head\b|body\b|style\b|script\b|div\b|section\b|main\b)[\s>]/i
  );
  if (!startMatch || startMatch.index == null) return text;

  const before = text.slice(0, startMatch.index).trimEnd();
  const html = text
    .slice(startMatch.index)
    .trim()
    .replace(/```/g, "`\u200b``");
  const fenced = `\`\`\`html-app\n${html}\n\`\`\``;
  return before ? `${before}\n\n${fenced}` : fenced;
};
