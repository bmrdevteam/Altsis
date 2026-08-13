import style from "./altBoard.module.scss";
import {
  TFormFileRef,
  fileThumbTone,
  fileTypeLabel,
  formatFileSize,
} from "./formFilePreview";

type Props = {
  file: TFormFileRef;
  onPreview?: (file: TFormFileRef) => void;
  onRemove?: () => void;
};

const THUMB_CLASS: Record<string, string> = {
  csv: style.filePreviewThumbCsv,
  pdf: style.filePreviewThumbPdf,
  html: style.filePreviewThumbHtml,
  image: style.filePreviewThumbImage,
  json: style.filePreviewThumbJson,
  text: style.filePreviewThumbText,
  office: style.filePreviewThumbOffice,
  archive: style.filePreviewThumbArchive,
  default: style.filePreviewThumbDefault,
};

const FileAttachCard = ({ file, onPreview, onRemove }: Props) => {
  const typeLabel = fileTypeLabel(file);
  const size = formatFileSize(file.size);
  const meta = [typeLabel, size].filter(Boolean).join(" · ");
  const thumbClass = THUMB_CLASS[fileThumbTone(file)] || style.filePreviewThumbDefault;

  return (
    <div className={style.docLinkItem}>
      <button
        type="button"
        className={style.linkPreview}
        onClick={() => onPreview?.(file)}
        disabled={!onPreview}
      >
        <span
          className={`${style.filePreviewThumb} ${thumbClass}`}
          aria-hidden
        >
          {typeLabel}
        </span>
        <div className={style.linkPreviewText}>
          <div className={style.linkPreviewTitle}>{file.originalName}</div>
          {meta && <div className={style.linkPreviewUrl}>{meta}</div>}
        </div>
      </button>
      {onRemove && (
        <button
          type="button"
          className={style.fileRemoveBtn}
          onClick={onRemove}
          aria-label={`${file.originalName} 삭제`}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default FileAttachCard;
