import { useEffect, useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import style from "./filePreviewModal.module.scss";
import {
  TFormFileRef,
  getFilePreviewKind,
} from "./formFilePreview";

type Props = {
  file: TFormFileRef | null;
  onClose: () => void;
};

const FilePreviewModal = ({ file, onClose }: Props) => {
  const { FileAPI } = useAPIv2();
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [textBody, setTextBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textError, setTextError] = useState("");

  const kind = file ? getFilePreviewKind(file) : "download";

  useEffect(() => {
    if (!file) {
      setViewUrl(null);
      setTextBody(null);
      setTextError("");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setTextBody(null);
      setTextError("");
      if (kind === "download") {
        setViewUrl(null);
        setLoading(false);
        return;
      }
      try {
        const { preSignedUrl } = await FileAPI.RSignedUrlDocument({
          query: { key: file.key, fileName: file.originalName, view: true },
        });
        if (cancelled) return;
        setViewUrl(preSignedUrl);
        if (kind === "text") {
          try {
            const res = await fetch(preSignedUrl);
            if (!res.ok) throw new Error("preview fetch failed");
            const body = await res.text();
            if (!cancelled) setTextBody(body);
          } catch {
            if (!cancelled) {
              setTextError("미리보기를 불러오지 못했습니다. 다운로드로 확인하세요.");
            }
          }
        }
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [file?.key, file?.originalName, kind]);

  const handleDownload = async () => {
    if (!file) return;
    try {
      const { preSignedUrl } = await FileAPI.RSignedUrlDocument({
        query: { key: file.key, fileName: file.originalName },
      });
      const anchor = document.createElement("a");
      anchor.href = preSignedUrl;
      anchor.download = file.originalName;
      anchor.rel = "noopener noreferrer";
      anchor.click();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  if (!file) return null;

  return (
    <Popup
      title={file.originalName}
      setState={() => onClose()}
      closeBtn
      contentScroll
      style={{ maxWidth: kind === "download" ? "480px" : "960px", width: "100%" }}
      footer={
        <div className={style.footer}>
          <Button type="ghost" onClick={handleDownload}>
            다운로드
          </Button>
        </div>
      }
    >
      <div className={style.body}>
        {loading && <p className={style.status}>불러오는 중…</p>}
        {!loading && kind === "image" && viewUrl && (
          <img
            className={style.image}
            src={viewUrl}
            alt={file.originalName}
          />
        )}
        {!loading && kind === "pdf" && viewUrl && (
          <iframe
            className={style.frame}
            src={viewUrl}
            title={file.originalName}
          />
        )}
        {!loading && kind === "html" && viewUrl && (
          <iframe
            className={style.frame}
            src={viewUrl}
            title={file.originalName}
            sandbox="allow-scripts"
          />
        )}
        {!loading && kind === "text" && textBody != null && (
          <pre className={style.pre}>{textBody}</pre>
        )}
        {!loading && (kind === "download" || textError) && (
          <p className={style.status}>
            {textError ||
              "이 파일은 브라우저에서 바로 볼 수 없습니다. 다운로드하세요."}
          </p>
        )}
      </div>
    </Popup>
  );
};

export default FilePreviewModal;
