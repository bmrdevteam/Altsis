/**
 * 마크다운 펜스·인라인 코드를 DOMPurify가 HTML로 파싱하지 않게 빼 둔다.
 * placeholder는 HTML comment가 아니라 텍스트 토큰 — sanitizer가 comment를 지울 수 있다.
 */
const placeholderAt = (index: number) => `%%MDCODE${index}%%`;

const FENCE_RE = /(?:```[\s\S]*?```|~~~[\s\S]*?~~~)/g;

/** CommonMark 인라인 코드: 같은 길이의 백틱 쌍 (lookbehind 없이 ES5 타깃 호환) */
const INLINE_CODE_RE = /(`+)((?:(?!\1)[\s\S])+?)\1/g;

const stash =
  (preserved: string[]) =>
  (match: string): string => {
    const token = placeholderAt(preserved.length);
    preserved.push(match);
    return token;
  };

export const preserveMarkdownCode = (
  content: string
): { withPlaceholders: string; preserved: string[] } => {
  const preserved: string[] = [];
  const push = stash(preserved);
  const withoutFences = String(content ?? "").replace(FENCE_RE, push);
  const withPlaceholders = withoutFences.replace(INLINE_CODE_RE, push);
  return { withPlaceholders, preserved };
};

export const restoreMarkdownCode = (
  text: string,
  preserved: string[]
): string => {
  let next = text;
  for (let i = preserved.length - 1; i >= 0; i -= 1) {
    next = next.replace(placeholderAt(i), preserved[i]);
  }
  return next;
};

/**
 * 챗봇 본문용: 코드 밖 HTML 태그를 글자로 보여 준다.
 * normalizeAlterMarkdown이 넣는 strong 등 인라인 서식은 유지한다.
 * `>` 전체를 바꾸면 인용/`> [!NOTE]` 콜아웃이 깨지므로 태그 형태만 이스케이프한다.
 */
const KEEP_HTML_TAGS = new Set(["strong", "em", "b", "i", "br", "del"]);

export const escapeHtmlTags = (text: string): string =>
  text.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g,
    (tag, name: string) => {
      if (KEEP_HTML_TAGS.has(name.toLowerCase())) return tag;
      return tag.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  );
