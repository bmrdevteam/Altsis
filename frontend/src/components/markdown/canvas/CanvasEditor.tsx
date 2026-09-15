import { useEffect, useMemo, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "../markdown.module.scss";
import CanvasCodeEditor from "./CanvasCodeEditor";
import {
  applyCanvasTitle,
  CANVAS_HTML_STARTER,
  CANVAS_MAX_BYTES,
  canvasByteSize,
  DEFAULT_CANVAS_HEIGHT,
  flattenCanvasToHtml,
  payloadFromAttrs,
  titleFromHtml,
} from "./canvasModel";

export type CanvasEditorSubmit = {
  embedType: "code";
  title?: string;
  html: string;
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

const CanvasEditor = ({ onSubmit, onLiveChange, initial }: Props) => {
  const initialPayload = initial
    ? payloadFromAttrs(initial)
    : { v: 1 as const, html: CANVAS_HTML_STARTER, css: "", javascript: "" };
  const initialHtml =
    flattenCanvasToHtml(initialPayload).trim() || CANVAS_HTML_STARTER;

  const [title, setTitle] = useState(
    initialPayload.title || titleFromHtml(initialHtml)
  );
  const [html, setHtml] = useState(initialHtml);
  const [error, setError] = useState("");

  const assembled = useMemo(
    () =>
      flattenCanvasToHtml({
        v: 1,
        ...(title.trim() ? { title: title.trim() } : {}),
        html,
        css: "",
        javascript: "",
      }),
    [title, html]
  );
  const codeSize = canvasByteSize(assembled);
  const isTooLarge = codeSize > CANVAS_MAX_BYTES;

  const toSubmit = (): CanvasEditorSubmit => ({
    embedType: "code",
    title: title.trim() || undefined,
    html: assembled,
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

  const handleTitleChange = (next: string) => {
    setTitle(next);
    setHtml((prev) => applyCanvasTitle(prev, next));
  };

  return (
    <div className={`${style.canvasEditor} ${style.canvasEditorInline}`}>
      <div className={style.canvasTitleField}>
        <span>제목</span>
        <div className={style.canvasTitleRow}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
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
          <CanvasCodeEditor
            language="html"
            value={html}
            onChange={(next) => {
              setHtml(next);
              if (error) setError("");
            }}
            ariaLabel="HTML 코드"
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
