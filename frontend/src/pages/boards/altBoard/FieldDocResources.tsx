import { useEffect, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TFormDocLink, TFormFileAttachment } from "types/altForm";
import { TFormFileRef } from "./formFilePreview";
import {
  hasLinkPreview,
  linkDisplayTitle,
  linkPreviewHostname,
  mergeOgIntoLink,
  sanitizeHttpUrl,
  youtubeThumbnailUrl,
} from "./formDocLink";
import useAPIv2 from "hooks/useAPIv2";
import LinkAttachModal from "./LinkAttachModal";
import FileAttachCard from "./FileAttachCard";
import LinkPreviewThumb from "./LinkPreviewThumb";

type Props = {
  attachments?: TFormFileAttachment[];
  links?: TFormDocLink[];
  editable?: boolean;
  uploading?: boolean;
  onPreview?: (file: TFormFileRef) => void;
  onUpload?: (file: File) => void;
  onRemoveAttachment?: (key: string) => void;
  onAddLink?: (link: TFormDocLink) => void;
  onPatchLink?: (url: string, link: TFormDocLink) => void;
  onRemoveLink?: (index: number) => void;
};

const FieldDocResources = ({
  attachments = [],
  links = [],
  editable = false,
  uploading = false,
  onPreview,
  onUpload,
  onRemoveAttachment,
  onAddLink,
  onPatchLink,
  onRemoveLink,
}: Props) => {
  const { PostAPI } = useAPIv2();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [localOg, setLocalOg] = useState<Record<string, TFormDocLink>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const fetchedUrls = useRef(new Set<string>());

  const fetchOg = async (url: string) => {
    try {
      return await PostAPI.RPostOgMeta({ query: { url } });
    } catch {
      return {};
    }
  };

  useEffect(() => {
    let cancelled = false;
    const missing = links.filter((link) => {
      const href = sanitizeHttpUrl(link.url);
      if (!href || fetchedUrls.current.has(href) || hasLinkPreview(link)) {
        return false;
      }
      fetchedUrls.current.add(href);
      return true;
    });
    if (missing.length === 0) return undefined;

    missing.forEach(async (link) => {
      const href = sanitizeHttpUrl(link.url);
      if (!href) return;
      setLoadingUrls((p) => ({ ...p, [href]: true }));
      const og = await fetchOg(href);
      if (cancelled) return;
      const next = mergeOgIntoLink({ ...link, url: href }, og);
      if (onPatchLink) onPatchLink(href, next);
      else setLocalOg((p) => ({ ...p, [href]: next }));
      setLoadingUrls((p) => {
        const copy = { ...p };
        delete copy[href];
        return copy;
      });
    });

    return () => {
      cancelled = true;
    };
    // PostAPI identity is unstable; fetch only when the link list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links]);

  const hasList = attachments.length > 0 || links.length > 0;
  if (!editable && !hasList) return null;

  return (
    <div className={style.docResources}>
      {attachments.map((f) => (
        <FileAttachCard
          key={f.key}
          file={f}
          onPreview={onPreview}
          onRemove={
            editable ? () => onRemoveAttachment?.(f.key) : undefined
          }
        />
      ))}
      {links.map((link, i) => {
        const href = sanitizeHttpUrl(link.url);
        if (!href) return null;
        const preview = { ...link, ...localOg[href], url: href };
        const display = linkDisplayTitle(preview);
        const ogImage =
          sanitizeHttpUrl(preview.ogImage || "") || youtubeThumbnailUrl(href);
        const loading = !!loadingUrls[href];
        return (
          <div key={`${href}-${i}`} className={style.docLinkItem}>
            <a
              className={style.linkPreview}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkPreviewThumb src={ogImage} />
              <div className={style.linkPreviewText}>
                <div className={style.linkPreviewTitle}>{display}</div>
                {preview.ogDescription && (
                  <div className={style.linkPreviewDesc}>
                    {preview.ogDescription}
                  </div>
                )}
                <div className={style.linkPreviewUrl}>
                  {loading ? "미리보기 로딩 중..." : linkPreviewHostname(href)}
                </div>
              </div>
            </a>
            {editable && (
              <button
                type="button"
                className={style.fileRemoveBtn}
                onClick={() => onRemoveLink?.(i)}
                aria-label={`${display} 삭제`}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {editable && (
        <>
          {uploading && (
            <div className={style.uploadProgress}>업로드 중...</div>
          )}
          {!uploading && (
            <div
              className={style.fileDropZone}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) onUpload?.(file);
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.onchange = () => {
                  const file = input.files?.[0];
                  if (file) onUpload?.(file);
                };
                input.click();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  (e.currentTarget as HTMLDivElement).click();
                }
              }}
              aria-label="참고 파일 업로드"
            >
              <span style={{ fontSize: "20px", opacity: 0.5 }}>📎</span>
              <span style={{ fontSize: "13px", color: "var(--text-color-2)" }}>
                참고 파일을 드래그하거나 클릭하여 첨부
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-color-2)",
                  opacity: 0.6,
                }}
              >
                최대 20MB · CSV, HTML, PDF 등
              </span>
            </div>
          )}
          <button
            type="button"
            className={style.docLinkAdd}
            onClick={() => setLinkModalOpen(true)}
          >
            <span className={style.docLinkAddIcon} aria-hidden>
              🔗
            </span>
            <span>참고 링크를 클릭하여 첨부</span>
          </button>
        </>
      )}
      {linkModalOpen && (
        <LinkAttachModal
          onClose={() => setLinkModalOpen(false)}
          onAdd={(link) => {
            fetchedUrls.current.add(link.url);
            onAddLink?.(link);
            setLinkModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default FieldDocResources;
