import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Svg from "assets/svg/Svg";
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
    // 자식이 문자열이고 YouTube URL 패턴인 경우 임베드
    if (typeof children === "string") {
      const youtubeId = extractYouTubeId(children.trim());
      if (youtubeId) {
        return <YouTubeEmbed videoId={youtubeId} />;
      }
    }
    // 자식이 배열인 경우
    if (Array.isArray(children) && children.length === 1) {
      // 문자열인 경우
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
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
};

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  minHeight = "300px",
}: Props) => {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 선택된 텍스트를 마크다운으로 래핑하거나 삽입
  const insertMarkdown = (
    prefix: string,
    suffix: string = "",
    placeholderText: string = ""
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholderText;

    const newValue =
      value.substring(0, start) +
      prefix +
      textToInsert +
      suffix +
      value.substring(end);

    onChange(newValue);

    // 커서 위치 조정
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText
        ? start + prefix.length + selectedText.length + suffix.length
        : start + prefix.length;
      textarea.setSelectionRange(
        selectedText ? newCursorPos : start + prefix.length,
        selectedText ? newCursorPos : start + prefix.length + placeholderText.length
      );
    }, 0);
  };

  // 이미지 URL 삽입
  const handleImageInsert = () => {
    const url = prompt("이미지 URL을 입력하세요:");
    if (url) {
      insertMarkdown("![이미지](", ")", url);
    }
  };

  // YouTube URL 삽입
  const handleYouTubeInsert = () => {
    const url = prompt("YouTube URL을 입력하세요:\n(예: https://www.youtube.com/watch?v=VIDEO_ID)");
    if (url) {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        insertMarkdown("\n![youtube](", ")\n", `https://www.youtube.com/watch?v=${videoId}`);
      } else {
        alert("유효한 YouTube URL이 아닙니다.");
      }
    }
  };

  // 가로줄 삽입
  const handleHorizontalRule = () => {
    insertMarkdown("\n---\n", "", "");
  };

  const toolbarButtons = [
    {
      icon: "heading",
      title: "제목",
      action: () => insertMarkdown("### ", "", "제목"),
    },
    {
      icon: "bold",
      title: "굵게",
      action: () => insertMarkdown("**", "**", "굵은 텍스트"),
    },
    {
      icon: "italic",
      title: "기울임",
      action: () => insertMarkdown("*", "*", "기울임 텍스트"),
    },
    {
      icon: "strikethrough",
      title: "취소선",
      action: () => insertMarkdown("~~", "~~", "취소선 텍스트"),
    },
    {
      icon: "code",
      title: "코드",
      action: () => insertMarkdown("`", "`", "코드"),
    },
    {
      icon: "link",
      title: "링크",
      action: () => insertMarkdown("[", "](url)", "링크 텍스트"),
    },
    {
      icon: "image",
      title: "이미지",
      action: handleImageInsert,
    },
    {
      icon: "listBullet",
      title: "목록",
      action: () => insertMarkdown("- ", "", "목록 항목"),
    },
    {
      icon: "listNumber",
      title: "번호 목록",
      action: () => insertMarkdown("1. ", "", "목록 항목"),
    },
    {
      icon: "checkbox",
      title: "체크박스",
      action: () => insertMarkdown("- [ ] ", "", "할 일"),
    },
    {
      icon: "quote",
      title: "인용",
      action: () => insertMarkdown("> ", "", "인용문"),
    },
    {
      icon: "horizontalRule",
      title: "가로줄",
      action: handleHorizontalRule,
    },
    {
      icon: "youtube",
      title: "YouTube",
      action: handleYouTubeInsert,
    },
  ];

  // 키보드 단축키 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          insertMarkdown("**", "**", "굵은 텍스트");
          break;
        case "i":
          e.preventDefault();
          insertMarkdown("*", "*", "기울임 텍스트");
          break;
        case "k":
          e.preventDefault();
          insertMarkdown("[", "](url)", "링크 텍스트");
          break;
      }
    }
  };

  return (
    <div className={style.editor}>
      <div className={style.toolbar}>
        <div className={style.tabs}>
          <button
            type="button"
            className={!isPreview ? style.active : ""}
            onClick={() => setIsPreview(false)}
          >
            작성
          </button>
          <button
            type="button"
            className={isPreview ? style.active : ""}
            onClick={() => setIsPreview(true)}
          >
            미리보기
          </button>
        </div>
        {!isPreview && (
          <div className={style.toolbarButtons}>
            {toolbarButtons.map((btn, idx) => (
              <button
                key={idx}
                type="button"
                title={btn.title}
                onClick={btn.action}
                className={style.toolbarBtn}
              >
                <Svg type={btn.icon} width="18px" height="18px" />
              </button>
            ))}
          </div>
        )}
      </div>
      {isPreview ? (
        <div
          className={`${style.preview} ${style.markdown}`}
          style={{ minHeight }}
        >
          {value ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className={style.placeholder}>미리볼 내용이 없습니다.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className={style.textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ minHeight }}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
