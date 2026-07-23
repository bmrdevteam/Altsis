/**
 * 마크다운 직렬화 유틸리티
 *
 * YouTube: ![youtube](URL) ↔ TipTap YouTube 노드
 * HTML 임베드: ```html-app ... ``` / ![embed](URL) ↔ TipTap HtmlEmbed 노드
 *
 * html: false 모드에서 동작:
 * - 전처리(HTML 삽입) 대신 에디터 초기화 후 노드 변환 방식 사용
 * - 후처리(HTML → 마크다운)는 동일하게 유지
 */

import type { Editor } from "@tiptap/react";
import { safeBtoa, safeAtob } from "./htmlEmbed";

// YouTube URL에서 비디오 ID 추출
export const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/**
 * 에디터 초기화 후 특수 노드 변환
 *
 * tiptap-markdown(html: false)이 마크다운을 파싱하면:
 * - ![youtube](URL) → Image 노드 (alt="youtube", src=URL)
 * - ![embed](URL) → Image 노드 (alt="embed", src=URL)
 * - ```html-app\n...\n``` → CodeBlock 노드 (language="html-app")
 *
 * 이 함수는 해당 노드들을 실제 YouTube/HtmlEmbed 노드로 변환합니다.
 */
export const transformSpecialNodes = (editor: Editor): void => {
  const { doc, schema } = editor.state;
  const youtubeType = schema.nodes.youtube;
  const htmlEmbedType = schema.nodes.htmlEmbed;
  const mathInlineType = schema.nodes.mathInline;
  const mathBlockType = schema.nodes.mathBlock;

  type Transform = {
    from: number;
    to: number;
    node: any;
  };

  const transforms: Transform[] = [];

  doc.descendants((node, pos) => {
    // ![youtube](URL) → YouTube 노드
    if (
      youtubeType &&
      node.type.name === "image" &&
      node.attrs.alt === "youtube" &&
      node.attrs.src
    ) {
      const videoId = extractYouTubeId(node.attrs.src);
      if (videoId) {
        transforms.push({
          from: pos,
          to: pos + node.nodeSize,
          node: youtubeType.create({
            src: `https://www.youtube.com/watch?v=${videoId}`,
          }),
        });
      }
    }

    // ![embed](URL) 또는 ![embed:HEIGHT](URL) → HtmlEmbed 노드
    if (
      htmlEmbedType &&
      node.type.name === "image" &&
      node.attrs.src
    ) {
      const embedMatch = (node.attrs.alt || "").match(
        /^embed(?::(\d+))?$/
      );
      if (embedMatch) {
        const height = embedMatch[1] ? parseInt(embedMatch[1], 10) : 0;
        transforms.push({
          from: pos,
          to: pos + node.nodeSize,
          node: htmlEmbedType.create({
            embedType: "url",
            content: node.attrs.src,
            height,
          }),
        });
      }
    }

    // ```html-app 또는 ```html-app:HEIGHT → HtmlEmbed 노드
    if (
      htmlEmbedType &&
      node.type.name === "codeBlock"
    ) {
      const langMatch = (node.attrs.language || "").match(
        /^html-app(?::(\d+))?$/
      );
      if (langMatch) {
        const height = langMatch[1] ? parseInt(langMatch[1], 10) : 0;
        transforms.push({
          from: pos,
          to: pos + node.nodeSize,
          node: htmlEmbedType.create({
            embedType: "code",
            content: node.textContent,
            height,
          }),
        });
      }
    }

    // $$...$$ 블록 수식 → MathBlock 노드 (paragraph 내 텍스트)
    if (
      mathBlockType &&
      node.type.name === "paragraph" &&
      node.textContent.trim().startsWith("$$") &&
      node.textContent.trim().endsWith("$$") &&
      !node.textContent.trim().slice(2, -2).includes("$$")
    ) {
      const latex = node.textContent.trim().slice(2, -2).trim();
      if (latex) {
        transforms.push({
          from: pos,
          to: pos + node.nodeSize,
          node: mathBlockType.create({ latex }),
        });
        return false; // 하위 텍스트는 인라인 변환 스킵
      }
    }

    // $...$ 인라인 수식 → MathInline 노드 (텍스트 노드 단위)
    if (mathInlineType && node.isText && node.text) {
      const text = node.text;
      const inlineMathRe = /\$([^$\n]+?)\$/g;
      let match: RegExpExecArray | null;
      while ((match = inlineMathRe.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        // $$...$$ 블록 구분자와 겹치면 스킵
        if (text[start - 1] === "$" || text[end] === "$") continue;
        const latex = match[1].trim();
        if (!latex) continue;
        transforms.push({
          from: pos + start,
          to: pos + end,
          node: mathInlineType.create({ latex }),
        });
      }
    }
  });

  if (transforms.length > 0) {
    // 위치 보정을 위해 역순으로 적용
    const { tr } = editor.state;
    for (const t of transforms.reverse()) {
      tr.replaceWith(t.from, t.to, t.node);
    }
    tr.setMeta("addToHistory", false); // 변환 이력에 추가하지 않음
    editor.view.dispatch(tr);
  }
};

/**
 * 에디터 → 마크다운 저장 시 후처리
 * TipTap 노드의 HTML 출력을 마크다운 형식으로 복원
 */
export const postprocessMarkdown = (md: string): string => {
  let result = md;

  // YouTube: <div data-youtube-video>...</div> → ![youtube](URL)
  result = result.replace(
    /<div data-youtube-video[^>]*>.*?<iframe[^>]*src="https?:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})[^"]*"[^>]*>.*?<\/iframe>.*?<\/div>/gs,
    (_match, videoId: string) => {
      return `![youtube](https://www.youtube.com/watch?v=${videoId})`;
    }
  );

  // YouTube: iframe만 있는 경우
  result = result.replace(
    /<iframe[^>]*src="https?:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})[^"]*"[^>]*><\/iframe>/g,
    (_match, videoId: string) => {
      return `![youtube](https://www.youtube.com/watch?v=${videoId})`;
    }
  );

  // HTML 임베드: <div data-html-embed ...> → markdown (height 포함)
  result = result.replace(
    /<div data-html-embed[^>]*><\/div>/g,
    (match) => {
      const typeMatch = match.match(/data-embed-type="(\w+)"/);
      const contentMatch = match.match(/data-embed-content="([^"]*)"/);
      const heightMatch = match.match(/data-embed-height="(\d+)"/);

      if (!typeMatch || !contentMatch) return match;

      const embedType = typeMatch[1];
      const encodedContent = contentMatch[1];
      const heightSuffix = heightMatch ? `:${heightMatch[1]}` : "";

      if (embedType === "code") {
        const decoded = safeAtob(encodedContent);
        return `\`\`\`html-app${heightSuffix}\n${decoded}\n\`\`\``;
      } else {
        return `![embed${heightSuffix}](${encodedContent})`;
      }
    }
  );

  return result;
};
