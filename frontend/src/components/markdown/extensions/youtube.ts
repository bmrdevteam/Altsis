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
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
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

  if (!youtubeType && !htmlEmbedType) return;

  type Transform = {
    from: number;
    to: number;
    node: ReturnType<typeof schema.nodes.youtube.create>;
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

    // ![embed](URL) → HtmlEmbed 노드
    if (
      htmlEmbedType &&
      node.type.name === "image" &&
      node.attrs.alt === "embed" &&
      node.attrs.src
    ) {
      transforms.push({
        from: pos,
        to: pos + node.nodeSize,
        node: htmlEmbedType.create({
          embedType: "url",
          content: node.attrs.src,
        }),
      });
    }

    // ```html-app → HtmlEmbed 노드
    if (
      htmlEmbedType &&
      node.type.name === "codeBlock" &&
      node.attrs.language === "html-app"
    ) {
      transforms.push({
        from: pos,
        to: pos + node.nodeSize,
        node: htmlEmbedType.create({
          embedType: "code",
          content: node.textContent,
        }),
      });
    }
  });

  if (transforms.length === 0) return;

  // 위치 보정을 위해 역순으로 적용
  const { tr } = editor.state;
  for (const t of transforms.reverse()) {
    tr.replaceWith(t.from, t.to, t.node);
  }
  tr.setMeta("addToHistory", false); // 변환 이력에 추가하지 않음
  editor.view.dispatch(tr);
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

  // HTML 임베드: <div data-html-embed ...> → markdown
  result = result.replace(
    /<div data-html-embed[^>]*data-embed-type="(\w+)"[^>]*data-embed-content="([^"]*)"[^>]*><\/div>/g,
    (_match, embedType: string, encodedContent: string) => {
      if (embedType === "code") {
        const decoded = safeAtob(encodedContent);
        return `\`\`\`html-app\n${decoded}\n\`\`\``;
      } else {
        return `![embed](${encodedContent})`;
      }
    }
  );

  return result;
};
