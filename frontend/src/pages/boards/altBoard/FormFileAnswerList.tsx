import style from "./altBoard.module.scss";
import FileAttachCard from "./FileAttachCard";
import LinkPreviewThumb from "./LinkPreviewThumb";
import { TFormFileRef } from "./formFilePreview";
import {
  isFileAnswerFile,
  isFileAnswerLink,
  linkDisplayTitle,
  linkPreviewHostname,
  sanitizeHttpUrl,
  youtubeThumbnailUrl,
} from "./formDocLink";

type Props = {
  items: unknown[];
  onPreview?: (file: TFormFileRef) => void;
};

/** 양식 파일 필드와 같은 첨부 카드 (읽기 전용) */
const FormFileAnswerList = ({ items, onPreview }: Props) => {
  if (!items.length) {
    return (
      <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>
        —
      </span>
    );
  }
  return (
    <div className={style.fileUploadArea}>
      {items.map((item, i) => {
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
            </div>
          );
        }
        if (!isFileAnswerFile(item)) return null;
        return (
          <FileAttachCard
            key={item.key || `${item.originalName}-${i}`}
            file={item}
            onPreview={onPreview}
          />
        );
      })}
    </div>
  );
};

export default FormFileAnswerList;
