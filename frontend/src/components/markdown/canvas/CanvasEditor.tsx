import { useEffect, useMemo, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "../markdown.module.scss";
import CanvasCodeEditor from "./CanvasCodeEditor";
import {
  buildCanvasSrcDoc,
  CANVAS_MAX_BYTES,
  canvasByteSize,
  DEFAULT_CANVAS_HEIGHT,
  emptyCanvasPayload,
  payloadFromAttrs,
  type CanvasPayload,
} from "./canvasModel";

export type CanvasEditorSubmit = {
  embedType: "code";
  title?: string;
  html: string;
  css: string;
  javascript: string;
  height: number;
};

type Props = {
  onSubmit: (value: CanvasEditorSubmit) => void;
  onLiveChange?: (value: CanvasEditorSubmit) => void;
  initial?: {
    embedType?: "code" | "url";
    title?: string;
    html?: string;
    css?: string;
    javascript?: string;
    content?: string;
    height?: number;
  };
};

type CodeTab = "html" | "css" | "javascript";

const CanvasEditor = ({ onSubmit, onLiveChange, initial }: Props) => {
  const initialPayload: CanvasPayload = initial
    ? payloadFromAttrs(initial)
    : emptyCanvasPayload();

  const [codeTab, setCodeTab] = useState<CodeTab>("html");
  const [title, setTitle] = useState(initialPayload.title || "");
  const [html, setHtml] = useState(initialPayload.html);
  const [css, setCss] = useState(initialPayload.css);
  const [javascript, setJavascript] = useState(initialPayload.javascript);
  const [error, setError] = useState("");

  const payload: CanvasPayload = useMemo(
    () => ({
      v: 1,
      ...(title.trim() ? { title: title.trim() } : {}),
      html,
      css,
      javascript,
    }),
    [title, html, css, javascript]
  );

  const assembled = useMemo(() => buildCanvasSrcDoc(payload), [payload]);
  const codeSize = canvasByteSize(assembled);
  const isTooLarge = codeSize > CANVAS_MAX_BYTES;

  const toSubmit = (): CanvasEditorSubmit => ({
    embedType: "code",
    title: title.trim() || undefined,
    html,
    css,
    javascript,
    height: initial?.height ?? DEFAULT_CANVAS_HEIGHT,
  });

  const latestSubmitRef = useRef(toSubmit());
  latestSubmitRef.current = toSubmit();
  const tooLargeRef = useRef(isTooLarge);
  tooLargeRef.current = isTooLarge;

  useEffect(() => {
    if (!onLiveChange || isTooLarge) return undefined;
    const timer = window.setTimeout(() => {
      onLiveChange(toSubmit());
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assembled, isTooLarge]);

  useEffect(() => {
    return () => {
      if (onLiveChange && !tooLargeRef.current) {
        onLiveChange(latestSubmitRef.current);
      }
    };
  }, [onLiveChange]);

  const handleSubmit = () => {
    if (isTooLarge) {
      setError(
        `캔버스가 너무 큽니다 (${(codeSize / 1024).toFixed(1)}KB). 100KB 이하로 줄여 주세요.`
      );
      return;
    }
    setError("");
    onSubmit(toSubmit());
  };

  const codeValue =
    codeTab === "html" ? html : codeTab === "css" ? css : javascript;
  const setCodeValue =
    codeTab === "html" ? setHtml : codeTab === "css" ? setCss : setJavascript;

  return (
    <div className={`${style.canvasEditor} ${style.canvasEditorInline}`}>
      <div className={style.canvasTitleField}>
        <span>제목</span>
        <div className={style.canvasTitleRow}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="캔버스 제목 (선택)"
            aria-label="캔버스 제목"
          />
          <div className={style.canvasEditorHeaderActions}>
            <button
              type="button"
              className={style.canvasEditorHeaderBtn}
              onClick={handleSubmit}
              disabled={isTooLarge}
              title="저장"
              aria-label="저장"
            >
              <Svg type="save" width="20px" height="20px" />
            </button>
          </div>
        </div>
      </div>
      <div className={style.canvasEditorPanes}>
        <div className={style.canvasEditorCode}>
          <div className={style.canvasLangTabs} role="tablist">
            {(["html", "css", "javascript"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={codeTab === key}
                className={codeTab === key ? style.active : ""}
                onClick={() => setCodeTab(key)}
              >
                {key === "javascript" ? "JavaScript" : key.toUpperCase()}
              </button>
            ))}
          </div>
          <CanvasCodeEditor
            language={codeTab}
            value={codeValue}
            onChange={(next) => {
              setCodeValue(next);
              if (error) setError("");
            }}
            ariaLabel={`${codeTab} 코드`}
          />
        </div>
      </div>
      <div className={style.embedInfo}>
        <span className={isTooLarge ? style.embedError : ""}>
          {(codeSize / 1024).toFixed(1)}KB / 100KB
        </span>
        {(error || isTooLarge) && (
          <span className={style.embedError}>
            {error || "코드가 너무 큽니다. 용량을 줄인 뒤 저장해 주세요."}
          </span>
        )}
      </div>
    </div>
  );
};

export default CanvasEditor;
