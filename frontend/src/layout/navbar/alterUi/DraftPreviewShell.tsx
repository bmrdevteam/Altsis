import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { printArea } from "utils/printArea";
import DraftResultCard from "./DraftResultCard";
import {
  DraftMetaVariant,
  fullscreenToggleLabel,
  searchPdfLabel,
  sourceToggleLabel,
} from "./draftUi";
import style from "../Alter.module.scss";

export type DraftPreviewContext = {
  fullscreen: boolean;
  sourceOpen: boolean;
};

type Props = {
  title: string;
  meta?: { label: string; variant?: DraftMetaVariant };
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode | ((ctx: DraftPreviewContext) => ReactNode);
  source?: ReactNode;
  sourceOpenLabel?: string;
  sourceCloseLabel?: string;
  printTitle?: string;
  onPrint?: (root: HTMLElement | null) => void | Promise<void>;
  wrapList?: boolean;
  showPrint?: boolean;
  fullscreenAriaLabel?: string;
};

const FullscreenIcon = ({ expanded }: { expanded: boolean }) =>
  expanded ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );

const DraftPreviewShell = ({
  title,
  meta,
  summary,
  actions,
  children,
  source,
  sourceOpenLabel,
  sourceCloseLabel,
  printTitle,
  onPrint,
  wrapList = true,
  showPrint = true,
  fullscreenAriaLabel,
}: Props) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const hasSource = source != null && source !== false;

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const handlePdf = () => {
    void (async () => {
      if (onPrint) {
        await onPrint(printRef.current);
        return;
      }
      printArea(printRef.current);
    })();
  };

  const body =
    typeof children === "function"
      ? children({ fullscreen, sourceOpen })
      : children;

  const card = (
    <DraftResultCard
      wrapList={wrapList}
      title={title}
      meta={meta}
      summary={summary}
      actions={
        <>
          {actions}
          {hasSource ? (
            <button
              type="button"
              className={style.applyBtn}
              onClick={() => setSourceOpen((v) => !v)}
            >
              {sourceOpen
                ? sourceCloseLabel || sourceToggleLabel(true)
                : sourceOpenLabel || sourceToggleLabel(false)}
            </button>
          ) : null}
          {showPrint ? (
            <button type="button" className={style.applyBtn} onClick={handlePdf}>
              {searchPdfLabel()}
            </button>
          ) : null}
          <button
            type="button"
            className={style.searchFsIconBtn}
            onClick={() => setFullscreen((v) => !v)}
            aria-pressed={fullscreen}
            aria-label={fullscreenToggleLabel(fullscreen)}
            title={fullscreenToggleLabel(fullscreen)}
          >
            <FullscreenIcon expanded={fullscreen} />
          </button>
        </>
      }
    >
      <div ref={printRef}>
        <h2 className={style.searchPrintTitle}>{printTitle || title}</h2>
        {sourceOpen && hasSource ? (
          <div className={style.searchSql}>{source}</div>
        ) : null}
        <div
          className={`${style.draftPreviewBody}${
            fullscreen ? ` ${style.draftPreviewBodyTall}` : ""
          }`}
        >
          {body}
        </div>
      </div>
    </DraftResultCard>
  );

  if (!fullscreen) return card;
  if (typeof document === "undefined") return card;

  return createPortal(
    <div className={style.searchFsRoot}>
      <button
        type="button"
        className={style.searchFsBackdrop}
        onClick={() => setFullscreen(false)}
        aria-label="닫기"
      />
      <div
        className={style.searchFsPanel}
        role="dialog"
        aria-modal="true"
        aria-label={fullscreenAriaLabel || `${title} 전체 화면`}
      >
        {card}
      </div>
    </div>,
    document.body
  );
};

export default DraftPreviewShell;
