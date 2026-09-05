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
  "referrerpolicy",
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

const isTrustedYouTubeFrame = (src: string): boolean => {
  try {
    const url = new URL(src, "https://altsis.invalid");
    return (
      url.protocol === "https:" &&
      (url.hostname === "www.youtube.com" ||
        url.hostname === "www.youtube-nocookie.com") &&
      /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
    );
  } catch {
    return false;
  }
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
  const iframeHook = (node: Element) => {
    if (node.nodeName?.toLowerCase() !== "iframe") return;
    node.removeAttribute("srcdoc");
    if (!isTrustedYouTubeFrame(node.getAttribute("src") || "")) {
      node.remove();
      return;
    }
    node.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-presentation"
    );
    node.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  };
  DOMPurify.addHook("uponSanitizeAttribute", styleHook);
  DOMPurify.addHook("afterSanitizeAttributes", iframeHook);

  let sanitized = "";
  try {
    sanitized = DOMPurify.sanitize(withCallouts, {
      ADD_TAGS: PURIFY_ADD_TAGS,
      ADD_ATTR: PURIFY_ADD_ATTR,
    });
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute", styleHook);
    DOMPurify.removeHook("afterSanitizeAttributes", iframeHook);
  }

  return restoreMarkdownCode(sanitized, preserved);
};
