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

// 마크다운 컴포넌트 커스터마이징
const markdownComponents = {
  // ![youtube](URL) 형식 처리
  img: ({ src, alt, ...props }: any) => {
    if (alt === "youtube" && src) {
      const youtubeId = extractYouTubeId(src);
      if (youtubeId) {
        return <YouTubeEmbed videoId={youtubeId} />;
      }
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
    return <a href={href} {...props}>{children}</a>;
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
