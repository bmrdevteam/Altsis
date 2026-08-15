import { useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import DOMPurify, {
  type UponSanitizeAttributeHookEvent,
} from "dompurify";
import style from "./markdown.module.scss";
import { preprocessCallouts } from "./extensions/callout";
import { sanitizeMarkdownInlineStyle } from "./sanitizeMarkdownInlineStyle";
import {
  buildCanvasSrcDoc,
  CANVAS_IFRAME_SANDBOX,
  parseCanvasContent,
  parseFenceLanguage,
  preserveInteractiveFences,
  restoreInteractiveFences,
} from "./canvas/canvasModel";

// @[이름](id) 멘션 패턴을 React 요소로 변환
const renderMentions = (text: string): (string | JSX.Element)[] => {
  const parts: (string | JSX.Element)[] = [];
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="mention-chip">
        @{match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
};

// YouTube URL에서 비디오 ID 추출
const extractYouTubeId = (url: string): string | null => {
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

// 전체보기 SVG 아이콘
const FullscreenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
  </svg>
);

// 전체보기 오버레이 컴포넌트
const FullscreenOverlay = ({
  embedType,
  content,
  onClose,
}: {
  embedType: "code" | "url";
  content: string;
  onClose: () => void;
}) => {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return createPortal(
    <div className={style.embedFullscreenOverlay} onClick={onClose}>
      <iframe
        {...(embedType === "url" ? { src: content } : { srcDoc: content })}
        sandbox={CANVAS_IFRAME_SANDBOX}
        title="캔버스 전체 보기"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        className={style.embedFullscreenClose}
        onClick={onClose}
        title="닫기 (ESC)"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
        </svg>
      </button>
    </div>,
    document.body
  );
};

// YouTube 컴포넌트
const YouTubeEmbed = ({ videoId }: { videoId: string }) => (
  <div className={style.youtubeWrapper}>
    <iframe
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
);

// HTML 앱 임베드 컴포넌트
const HtmlAppEmbed = ({
  html,
  height,
}: {
  html: string;
  height?: number;
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const close = useCallback(() => setFullscreen(false), []);

  return (
    <>
      <div className={style.htmlEmbedWrapper}>
        <iframe
          srcDoc={html}
          sandbox={CANVAS_IFRAME_SANDBOX}
          title="캔버스"
          style={height ? { height: `${height}px` } : undefined}
        />
        <button
          type="button"
          className={style.embedFullscreenBtn}
          onClick={() => setFullscreen(true)}
          title="전체 보기"
        >
          <FullscreenIcon />
        </button>
      </div>
      {fullscreen && (
        <FullscreenOverlay
          embedType="code"
          content={html}
          onClose={close}
        />
      )}
    </>
  );
};

// URL 임베드 컴포넌트
const UrlEmbed = ({ url, height }: { url: string; height?: number }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const close = useCallback(() => setFullscreen(false), []);

  return (
    <>
      <div className={style.htmlEmbedWrapper}>
        <iframe
          src={url}
          sandbox={CANVAS_IFRAME_SANDBOX}
          title="임베드된 페이지"
          style={height ? { height: `${height}px` } : undefined}
        />
        <button
          type="button"
          className={style.embedFullscreenBtn}
          onClick={() => setFullscreen(true)}
          title="전체 보기"
        >
          <FullscreenIcon />
        </button>
      </div>
      {fullscreen && (
        <FullscreenOverlay embedType="url" content={url} onClose={close} />
      )}
    </>
  );
};

// 기본 마크다운 컴포넌트
const baseComponents = {
  // ![youtube](URL) / ![embed](URL) / ![embed:HEIGHT](URL) 형식 처리
  img: ({ src, alt, ...props }: any) => {
    if (alt === "youtube" && src) {
      const youtubeId = extractYouTubeId(src);
      if (youtubeId) {
        return <YouTubeEmbed videoId={youtubeId} />;
      }
    }
    // embed 또는 embed:HEIGHT 형식 파싱
    const embedMatch = (alt || "").match(/^embed(?::(\d+))?$/);
    if (embedMatch && src) {
      const height = embedMatch[1] ? parseInt(embedMatch[1], 10) : undefined;
      return <UrlEmbed url={src} height={height} />;
    }
    return <img src={src} alt={alt} {...props} />;
  },
  // YouTube 링크를 임베드로 변환
  a: ({ href, children, ...props }: any) => {
    if (href) {
      const youtubeId = extractYouTubeId(href);
      if (youtubeId) {
        return <YouTubeEmbed videoId={youtubeId} />;
      }
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  p: ({ children, ...props }: any) => {
    if (typeof children === "string") {
      const youtubeId = extractYouTubeId(children.trim());
      if (youtubeId) {
        return <YouTubeEmbed videoId={youtubeId} />;
      }
    }
    if (Array.isArray(children) && children.length === 1) {
      if (typeof children[0] === "string") {
        const youtubeId = extractYouTubeId(children[0].trim());
        if (youtubeId) {
          return <YouTubeEmbed videoId={youtubeId} />;
        }
      }
    }
    // 멘션 패턴 처리: @[이름](id)
    const processed = Array.isArray(children)
      ? children.map((child: any) =>
          typeof child === "string" && child.includes("@[")
            ? renderMentions(child)
            : child
        )
      : typeof children === "string" && children.includes("@[")
      ? renderMentions(children)
      : children;
    return <p {...props}>{processed}</p>;
  },
  // ```html-app / ```canvas 코드 블록을 임베드로 렌더링
  code: ({ className, children, ...props }: any) => {
    const fence = parseFenceLanguage(className);
    if (fence) {
      const raw = String(children).replace(/\n$/, "");
      const html = buildCanvasSrcDoc(parseCanvasContent(raw));
      return <HtmlAppEmbed html={html} height={fence.height} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  // pre 태그에서 html-app 코드 블록 감지
  pre: ({ children, ...props }: any) => {
    // children이 code 엘리먼트이고 language-html-app 클래스를 가지면
    // code 컴포넌트가 이미 iframe으로 변환하므로 pre 래핑 제거
    if (
      children?.props?.className?.includes("language-html-app") ||
      children?.props?.className?.includes("language-canvas")
    ) {
      return <>{children}</>;
    }
    return <pre {...props}>{children}</pre>;
  },
  // 제출/열람용: raw HTML·GFM 체크박스는 토글 불가
  input: ({ type, checked, ...props }: any) => {
    if (type === "checkbox") {
      return (
        <input
          {...props}
          type="checkbox"
          checked={!!checked}
          disabled
          readOnly
          onChange={() => {}}
        />
      );
    }
    return <input type={type} {...props} />;
  },
};

export type Props = {
  content: string;
  className?: string;
  /**
   * true면 ```html-app``` / ```canvas``` 블록을 스크립트 실행 iframe으로 복원.
   * 응답자 작성 본문에는 false (기본) — 저장 XSS 방지.
   */
  allowHtmlApp?: boolean;
};

const MarkdownViewer = ({
  content,
  className,
  allowHtmlApp = false,
}: Props) => {
  const sanitizedContent = useMemo(() => {
    // 인터랙티브 펜스를 DOMPurify 처리 전에 추출 (script 태그 보존)
    const { withPlaceholders, preserved } = allowHtmlApp
      ? preserveInteractiveFences(content)
      : { withPlaceholders: content, preserved: [] as string[] };

    // 콜아웃 마크다운 → HTML (sanitize 전에 변환)
    const withCallouts = preprocessCallouts(withPlaceholders);

    // 표·문단 레이아웃 스타일만 허용 (url/position 등은 차단)
    const styleHook = (node: Element, data: UponSanitizeAttributeHookEvent) => {
      if (data.attrName !== "style") return;
      const tag = node.nodeName?.toLowerCase() || "";
      const next = sanitizeMarkdownInlineStyle(tag, data.attrValue || "");
      if (!next) {
        data.keepAttr = false;
        return;
      }
      data.attrValue = next;
    };
    DOMPurify.addHook("uponSanitizeAttribute", styleHook);

    let sanitized = "";
    try {
      sanitized = DOMPurify.sanitize(withCallouts, {
        ADD_TAGS: [
          "iframe",
          "math", "semantics", "mrow", "mi", "mn", "mo", "msup", "msub", "mfrac", "annotation",
          "svg",
          "path",
        ],
        ADD_ATTR: [
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
        ],
      });
    } finally {
      DOMPurify.removeHook("uponSanitizeAttribute", styleHook);
    }

    sanitized = restoreInteractiveFences(sanitized, preserved);

    return sanitized;
  }, [content, allowHtmlApp]);

  return (
    <div className={`${style.markdown} ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex] as any}
        components={baseComponents}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
