import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import style from "./markdown.module.scss";

// YouTube URL에서 비디오 ID 추출
const extractYouTubeId = (url: string): string | null => {
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
const HtmlAppEmbed = ({ html }: { html: string }) => (
  <div className={style.htmlEmbedWrapper}>
    <iframe
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      title="임베드된 앱"
    />
  </div>
);

// URL 임베드 컴포넌트
const UrlEmbed = ({ url }: { url: string }) => (
  <div className={style.htmlEmbedWrapper}>
    <iframe
      src={url}
      sandbox="allow-scripts allow-same-origin"
      title="임베드된 앱"
    />
  </div>
);

// 마크다운 컴포넌트 커스터마이징
const markdownComponents = {
  // ![youtube](URL) / ![embed](URL) 형식 처리
  img: ({ src, alt, ...props }: any) => {
    if (alt === "youtube" && src) {
      const youtubeId = extractYouTubeId(src);
      if (youtubeId) {
        return <YouTubeEmbed videoId={youtubeId} />;
      }
    }
    if (alt === "embed" && src) {
      return <UrlEmbed url={src} />;
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
    return <p {...props}>{children}</p>;
  },
  // ```html-app 코드 블록을 임베드로 렌더링
  code: ({ className, children, ...props }: any) => {
    const match = /language-html-app/.exec(className || "");
    if (match) {
      const html = String(children).replace(/\n$/, "");
      return <HtmlAppEmbed html={html} />;
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
    if (children?.props?.className?.includes("language-html-app")) {
      return <>{children}</>;
    }
    return <pre {...props}>{children}</pre>;
  },
};

type Props = {
  content: string;
  className?: string;
};

const MarkdownViewer = ({ content, className }: Props) => {
  return (
    <div className={`${style.markdown} ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
