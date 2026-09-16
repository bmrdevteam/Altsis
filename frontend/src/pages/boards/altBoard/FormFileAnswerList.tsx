import { useRef, useState } from "react";
import style from "./altBoard.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import FileAttachCard from "./FileAttachCard";
import LinkPreviewThumb from "./LinkPreviewThumb";
import LinkAttachModal from "./LinkAttachModal";
import { TFormFileRef } from "./formFilePreview";
import {
  isFileAnswerFile,
  isFileAnswerLink,
  linkDisplayTitle,
  linkPreviewHostname,
  sanitizeHttpUrl,
  youtubeThumbnailUrl,
} from "./formDocLink";

const MAX_FORM_FILE_BYTES = 20 * 1024 * 1024;

type Props = {
  items: unknown[];
  onPreview?: (file: TFormFileRef) => void;
  /** 있으면 삭제·업로드·링크 추가가 열린다 */
  onChange?: (items: unknown[]) => void;
};

const FormFileAnswerList = ({ items, onPreview, onChange }: Props) => {
  const { FileAPI } = useAPIv2();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const editable = !!onChange;
  const list = Array.isArray(items) ? items : [];

  const removeItem = (index: number) => {
    onChange?.(list.filter((_, i) => i !== index));
  };

  const handleFileSelect = async (file: File) => {
    if (!onChange) return;
    if (file.size > MAX_FORM_FILE_BYTES) {
      alert(`${file.name}: 파일 크기는 20MB 이하여야 합니다.`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await FileAPI.CUploadFileForm({ data: formData });
      onChange([
        ...list,
        {
          originalName: result.originalName,
          key: result.key,
          mimeType: result.mimeType,
          size: result.size,
        },
      ]);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!editable && !list.length) {
    return (
      <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
        —
      </span>
    );
  }

  return (
    <div className={style.fileUploadArea}>
      {list.map((item, i) => {
        if (isFileAnswerLink(item)) {
          const href = sanitizeHttpUrl(item.url);
          if (!href) return null;
          const display = linkDisplayTitle({ ...item, url: href });
          const ogImage =
            sanitizeHttpUrl(item.ogImage || "") || youtubeThumbnailUrl(href);
          return (
            <div key={`link-${href}-${i}`} className={style.docLinkItem}>
              <a
                className={style.linkPreview}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkPreviewThumb src={ogImage} />
                <div className={style.linkPreviewText}>
                  <div className={style.linkPreviewTitle}>{display}</div>
                  {item.ogDescription && (
                    <div className={style.linkPreviewDesc}>
                      {item.ogDescription}
                    </div>
                  )}
                  <div className={style.linkPreviewUrl}>
                    {linkPreviewHostname(href)}
                  </div>
                </div>
              </a>
              {editable && (
                <button
                  type="button"
                  className={style.fileRemoveBtn}
                  onClick={() => removeItem(i)}
                  aria-label={`${display} 삭제`}
                >
                  ×
                </button>
              )}
            </div>
          );
        }
        if (!isFileAnswerFile(item)) return null;
        return (
          <FileAttachCard
            key={item.key || `${item.originalName}-${i}`}
            file={item}
            onPreview={onPreview}
            onRemove={editable ? () => removeItem(i) : undefined}
          />
        );
      })}

      {editable && uploading && (
        <div className={style.uploadProgress}>업로드 중...</div>
      )}

      {editable && !uploading && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
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
              if (file) handleFileSelect(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="파일 업로드"
          >
            <span style={{ fontSize: "20px", opacity: 0.5 }}>📎</span>
            <span style={{ fontSize: "13px", color: "var(--text-color-2)" }}>
              파일을 드래그하거나{" "}
              <span style={{ color: "var(--accent-1)", fontWeight: 500 }}>
                클릭하여 선택
              </span>
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-color-2)",
                opacity: 0.6,
              }}
            >
              최대 20MB
              {list.length > 0 && ` · ${list.length}개 첨부됨`}
            </span>
          </div>
          <button
            type="button"
            className={style.docLinkAdd}
            onClick={() => setLinkOpen(true)}
          >
            <span className={style.docLinkAddIcon} aria-hidden>
              🔗
            </span>
            <span>링크를 클릭하여 첨부</span>
          </button>
        </>
      )}

      {linkOpen && (
        <LinkAttachModal
          onClose={() => setLinkOpen(false)}
          onAdd={(link) => {
            onChange?.([...list, link]);
            setLinkOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default FormFileAnswerList;
