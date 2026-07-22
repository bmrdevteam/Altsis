import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import DOMPurify from "dompurify";
import style from "./markdown.module.scss";

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
        sandbox="allow-scripts allow-same-origin"
        title="임베드된 앱 (전체 보기)"
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
          sandbox="allow-scripts allow-same-origin"
          title="임베드된 앱"
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
          sandbox="allow-scripts allow-same-origin"
          title="임베드된 앱"
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

// ─── 머지 인라인 입력 컴포넌트 ───

type MergeInputProps = {
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  errors: Record<string, string>;
  disabled: boolean;
};

const MergeInputField = ({
  fieldId,
  fieldType,
  label,
  defaultValue,
  required,
  options,
  validation,
  mergeInputPropsRef,
}: {
  fieldId: string;
  fieldType: string;
  label: string;
  defaultValue: string;
  required: boolean;
  options: string[];
  validation: Record<string, any>;
  mergeInputPropsRef: React.RefObject<MergeInputProps | undefined>;
}) => {
  const [localValue, setLocalValue] = useState<any>(defaultValue ?? "");
  const mergeInputProps = mergeInputPropsRef.current;

  if (!mergeInputProps) {
    return <span className={style.mergeInputValue}>{defaultValue || label}</span>;
  }

  const { onChange, errors, disabled } = mergeInputProps;
  const error = errors[fieldId];
  const errorCls = error ? ` ${style.mergeInputError}` : "";
  const handleChange = (val: any) => { setLocalValue(val); onChange(fieldId, val); };
  const value = localValue;
  const errEl = error ? <span className={style.mergeInputErrorMsg}>{error}</span> : null;

  switch (fieldType) {
    case "textarea":
      return (
        <span className={style.mergeInputWrapper}>
          <textarea className={`${style.mergeInputTextarea}${errorCls}`} value={value}
            onChange={(e) => handleChange(e.target.value)} placeholder={label} disabled={disabled} />
          {errEl}
        </span>
      );

    case "date":
      return (
        <span className={style.mergeInputWrapper}>
          <input className={`${style.mergeInput}${errorCls}`} type="date" value={value}
            onChange={(e) => handleChange(e.target.value)} disabled={disabled}
            min={validation?.minDate} max={validation?.maxDate} />
          {errEl}
        </span>
      );

    case "multiDate": {
      const dates: string[] = Array.isArray(value) ? value : value ? [value] : [];
      return (
        <span className={style.mergeInputWrapper}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {dates.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <input className={style.mergeInput} type="date" value={d}
                  onChange={(e) => { const next = [...dates]; next[i] = e.target.value; handleChange(next); }}
                  disabled={disabled} />
                {!disabled && (
                  <span style={{ cursor: "pointer", color: "var(--status-error)", fontSize: "18px" }}
                    onClick={() => handleChange(dates.filter((_, j) => j !== i))}>×</span>
                )}
              </div>
            ))}
            {!disabled && (
              <span style={{ cursor: "pointer", color: "var(--primary-color)", fontSize: "12px" }}
                onClick={() => handleChange([...dates, ""])}>+ 날짜 추가</span>
            )}
          </div>
          {errEl}
        </span>
      );
    }

    case "time":
      return (
        <span className={style.mergeInputWrapper}>
          <input className={`${style.mergeInput}${errorCls}`} type="time" value={value}
            onChange={(e) => handleChange(e.target.value)} disabled={disabled} />
          {errEl}
        </span>
      );

    case "number":
      return (
        <span className={style.mergeInputWrapper}>
          <input className={`${style.mergeInput}${errorCls}`} type="number" value={value}
            onChange={(e) => handleChange(e.target.value)} placeholder={label} disabled={disabled} />
          {errEl}
        </span>
      );

    case "select":
      return (
        <span className={style.mergeInputWrapper}>
          <select className={`${style.mergeInputSelect}${errorCls}`} value={value}
            onChange={(e) => handleChange(e.target.value)} disabled={disabled}>
            <option value="">{label}</option>
            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {errEl}
        </span>
      );

    case "multiSelect": {
      const selected: string[] = Array.isArray(value) ? value : [];
      const toggle = (opt: string) => {
        handleChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
      };
      return (
        <span className={style.mergeInputWrapper}>
          <span className={style.mergeInputRadioGroup}>
            {options.map((opt) => (
              <label key={opt}>
                <input type="checkbox" checked={selected.includes(opt)}
                  onChange={() => toggle(opt)} disabled={disabled}
                  style={{ accentColor: "var(--primary-color)" }} />
                {opt}
              </label>
            ))}
          </span>
          {errEl}
        </span>
      );
    }

    case "radio":
      return (
        <span className={style.mergeInputWrapper}>
          <span className={style.mergeInputRadioGroup}>
            {options.map((opt) => (
              <label key={opt}>
                <input type="radio" name={`merge-radio-${fieldId}`} value={opt}
                  checked={value === opt} onChange={(e) => handleChange(e.target.value)} disabled={disabled} />
                {opt}
              </label>
            ))}
          </span>
          {errEl}
        </span>
      );

    case "checkbox":
      return (
        <span className={style.mergeInputWrapper}>
          <label style={{ cursor: disabled ? "default" : "pointer" }}>
            <input type="checkbox" checked={value === true || value === "true" || value === "Y"}
              onChange={(e) => handleChange(e.target.checked)} disabled={disabled}
              style={{ accentColor: "var(--primary-color)" }} />
          </label>
          {errEl}
        </span>
      );

    case "rating": {
      const maxStars = validation?.maxStars || 5;
      const rating = Number(value) || 0;
      return (
        <span className={style.mergeInputWrapper}>
          <span style={{ display: "inline-flex", gap: "2px", fontSize: "20px", cursor: disabled ? "default" : "pointer" }}>
            {Array.from({ length: maxStars }, (_, i) => (
              <span key={i} onClick={() => !disabled && handleChange(i + 1)}
                style={{ color: i < rating ? "var(--status-warning, #f59e0b)" : "var(--border-default-color)" }}>
                ★
              </span>
            ))}
          </span>
          {errEl}
        </span>
      );
    }

    case "scale": {
      const min = validation?.min ?? 1;
      const max = validation?.max ?? 5;
      const minLabel = validation?.minLabel || "";
      const maxLabel = validation?.maxLabel || "";
      const scaleOptions = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <span className={style.mergeInputWrapper}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
            {minLabel && <span style={{ color: "var(--text-color-2)", fontSize: "11px" }}>{minLabel}</span>}
            {scaleOptions.map((n) => (
              <label key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: disabled ? "default" : "pointer" }}>
                <input type="radio" name={`merge-scale-${fieldId}`} value={n}
                  checked={Number(value) === n} onChange={() => handleChange(n)} disabled={disabled}
                  style={{ accentColor: "var(--primary-color)" }} />
                <span style={{ fontSize: "11px" }}>{n}</span>
              </label>
            ))}
            {maxLabel && <span style={{ color: "var(--text-color-2)", fontSize: "11px" }}>{maxLabel}</span>}
          </div>
          {errEl}
        </span>
      );
    }

    case "counter":
      return (
        <span className={style.mergeInputWrapper}>
          <span className={style.mergeInputValue} style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            (카운터 — 자동 집계)
          </span>
        </span>
      );

    case "file":
      return (
        <span className={style.mergeInputWrapper}>
          <span className={style.mergeInputValue} style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            (파일 첨부는 양식에서 직접 제출해주세요)
          </span>
        </span>
      );

    case "userSelect":
      return (
        <span className={style.mergeInputWrapper}>
          <span className={style.mergeInputValue} style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            (사용자 선택은 양식에서 직접 제출해주세요)
          </span>
        </span>
      );

    case "approval":
      return (
        <span className={style.mergeInputWrapper}>
          <span className={style.mergeInputValue} style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            (승인은 양식에서 직접 제출해주세요)
          </span>
        </span>
      );

    // text (default)
    default:
      return (
        <span className={style.mergeInputWrapper}>
          <input className={`${style.mergeInput}${errorCls}`} type="text" value={value}
            onChange={(e) => handleChange(e.target.value)} placeholder={label} disabled={disabled} />
          {errEl}
        </span>
      );
  }
};

// 기본 마크다운 컴포넌트 (merge input 무관)
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
  // ```html-app / ```html-app:HEIGHT 코드 블록을 임베드로 렌더링
  code: ({ className, children, ...props }: any) => {
    const match = /language-html-app(?::(\d+))?/.exec(className || "");
    if (match) {
      const html = String(children).replace(/\n$/, "");
      const height = match[1] ? parseInt(match[1], 10) : undefined;
      return <HtmlAppEmbed html={html} height={height} />;
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
  mergeInputProps?: MergeInputProps;
};

const MarkdownViewer = ({ content, className, mergeInputProps }: Props) => {
  // ref로 최신 mergeInputProps를 참조 (components 재생성 방지)
  const mergeInputPropsRef = useRef(mergeInputProps);
  mergeInputPropsRef.current = mergeInputProps;

  const sanitizedContent = useMemo(() => {
    // html-app 코드 블록을 DOMPurify 처리 전에 추출 (script 태그 보존)
    const preserved: string[] = [];
    const withPlaceholders = content.replace(
      /```html-app(?::\d+)?\n[\s\S]*?```/g,
      (match) => {
        preserved.push(match);
        return `__HTMLAPP_PRESERVE_${preserved.length - 1}__`;
      }
    );

    let sanitized = DOMPurify.sanitize(withPlaceholders, {
      ADD_TAGS: [
        "iframe",
        "math", "semantics", "mrow", "mi", "mn", "mo", "msup", "msub", "mfrac", "annotation",
        "merge-input",
      ],
      ADD_ATTR: [
        "allow",
        "allowfullscreen",
        "frameborder",
        "scrolling",
        "sandbox",
        "srcdoc",
        "data-youtube-video",
        "data-html-embed",
        "data-embed-type",
        "data-embed-content",
        "data-embed-height",
        "data-mention",
        "data-id",
        "data-color",
        "data-field-id",
        "data-type",
        "data-label",
        "data-value",
        "data-required",
        "data-options",
        "data-validation",
        "data-align",
        "data-inline-checkbox",
        "data-checked",
      ],
    });

    // 보존된 html-app 코드 블록 복원
    preserved.forEach((block, i) => {
      sanitized = sanitized.replace(`__HTMLAPP_PRESERVE_${i}__`, block);
    });

    return sanitized;
  }, [content]);

  // merge-input 커스텀 컴포넌트 (ref로 최신 props 참조 → components 재생성 없음)
  const hasMergeInput = !!mergeInputProps;
  const components = useMemo(() => {
    return {
      ...baseComponents,
      "merge-input": (props: any) => {
        const fieldId = props["data-field-id"] || "";
        const fieldType = props["data-type"] || "text";
        const label = props["data-label"] || "";
        const defaultValue = props["data-value"] || "";
        const required = props["data-required"] === "true";
        let options: string[] = [];
        let validation: Record<string, any> = {};
        try {
          if (props["data-options"]) options = JSON.parse(props["data-options"]);
        } catch { /* ignore */ }
        try {
          if (props["data-validation"]) validation = JSON.parse(props["data-validation"]);
        } catch { /* ignore */ }

        return (
          <MergeInputField
            fieldId={fieldId}
            fieldType={fieldType}
            label={label}
            defaultValue={defaultValue}
            required={required}
            options={options}
            validation={validation}
            mergeInputPropsRef={mergeInputPropsRef}
          />
        );
      },
    };
    // hasMergeInput만 의존: 입력 모드 전환 시에만 재생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMergeInput]);

  return (
    <div className={`${style.markdown} ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex] as any}
        components={components}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
export type { MergeInputProps };
