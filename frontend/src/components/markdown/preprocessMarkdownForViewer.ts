import DOMPurify, {
  type UponSanitizeAttributeHookEvent,
} from "dompurify";
import { preprocessCallouts } from "./extensions/callout";
import { sanitizeMarkdownInlineStyle } from "./sanitizeMarkdownInlineStyle";
import { repairCanvasMarkdown } from "./canvas/canvasModel";
import {
  escapeHtmlTags,
  preserveMarkdownCode,
  restoreMarkdownCode,
} from "./preserveMarkdownCode";

const PURIFY_ADD_TAGS = [
  "iframe",
  "math",
  "semantics",
  "mrow",
  "mi",
  "mn",
  "mo",
  "msup",
  "msub",
  "mfrac",
  "annotation",
  "svg",
  "path",
];

const PURIFY_ADD_ATTR = [
  "allow",
  "allowfullscreen",
  "frameborder",
  "scrolling",
  "sandbox",
  "srcdoc",
  "style",
  "data-youtube-video",
  "data-html-embed",
  "data-embed-type",
  "data-embed-content",
  "data-embed-height",
  "data-mention",
  "data-id",
  "data-color",
  "data-align",
  "data-inline-checkbox",
  "data-checked",
  "data-callout",
  "viewBox",
  "xmlns",
  "fill",
  "d",
  "aria-hidden",
  "aria-label",
  "title",
];

export type PreprocessMarkdownForViewerOptions = {
  /**
   * true면 코드 밖 HTML 태그를 이스케이프한다 (챗봇 답변).
   * 문서 뷰어는 false — Tiptap HTML·임베드를 유지한다.
   */
  escapeRawHtml?: boolean;
};

/**
 * MarkdownViewer가 ReactMarkdown에 넘기기 전 본문 전처리.
 * 펜스·인라인 코드를 빼 둔 뒤 sanitizer를 돌려, `` `<a>` ``가 링크로 열리지 않게 한다.
 */
export const preprocessMarkdownForViewer = (
  content: string,
  options: PreprocessMarkdownForViewerOptions = {}
): string => {
  const repaired = repairCanvasMarkdown(content);
  const { withPlaceholders, preserved } = preserveMarkdownCode(repaired);

  let next = withPlaceholders;
  if (options.escapeRawHtml) {
    next = escapeHtmlTags(next);
  }

  const withCallouts = preprocessCallouts(next);

  const styleHook = (node: Element, data: UponSanitizeAttributeHookEvent) => {
    if (data.attrName !== "style") return;
    const tag = node.nodeName?.toLowerCase() || "";
    const sanitizedStyle = sanitizeMarkdownInlineStyle(
      tag,
      data.attrValue || ""
    );
    if (!sanitizedStyle) {
      data.keepAttr = false;
      return;
    }
    data.attrValue = sanitizedStyle;
  };
  DOMPurify.addHook("uponSanitizeAttribute", styleHook);

  let sanitized = "";
  try {
    sanitized = DOMPurify.sanitize(withCallouts, {
      ADD_TAGS: PURIFY_ADD_TAGS,
      ADD_ATTR: PURIFY_ADD_ATTR,
    });
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute", styleHook);
  }

  return restoreMarkdownCode(sanitized, preserved);
};
