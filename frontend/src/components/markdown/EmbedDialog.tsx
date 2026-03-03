import { useState } from "react";
import Popup from "components/popup/Popup";
import style from "./markdown.module.scss";

const MAX_INLINE_SIZE = 50 * 1024; // 50KB

type Props = {
  onSubmit: (embedType: "code" | "url", content: string) => void;
  onClose: () => void;
};

const EmbedDialog = ({ onSubmit, onClose }: Props) => {
  const [tab, setTab] = useState<"code" | "url">("code");
  const [htmlCode, setHtmlCode] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");

  const codeSize = new Blob([htmlCode]).size;
  const isTooLarge = codeSize > MAX_INLINE_SIZE;

  const handleSubmit = () => {
    if (tab === "code") {
      if (!htmlCode.trim()) return;
      if (isTooLarge) {
        alert(
          `HTML 코드가 너무 큽니다 (${(codeSize / 1024).toFixed(1)}KB).\n50KB 이하로 줄이거나 파일로 업로드해주세요.`
        );
        return;
      }
      onSubmit("code", htmlCode);
    } else {
      if (!embedUrl.trim()) return;
      onSubmit("url", embedUrl.trim());
    }
  };

  return (
    <Popup
      title="HTML 삽입"
      setState={onClose}
      closeBtn
      style={{ maxWidth: "640px", width: "100%" }}
      footer={
        <div className={style.embedDialogFooter}>
          <button
            type="button"
            className={style.embedDialogBtn}
            onClick={handleSubmit}
          >
            삽입
          </button>
        </div>
      }
    >
      <div className={style.embedDialog}>
        <div className={style.embedTabs}>
          <button
            type="button"
            className={tab === "code" ? style.active : ""}
            onClick={() => setTab("code")}
          >
            HTML 코드
          </button>
          <button
            type="button"
            className={tab === "url" ? style.active : ""}
            onClick={() => setTab("url")}
          >
            URL
          </button>
        </div>

        {tab === "code" ? (
          <div className={style.embedContent}>
            <textarea
              className={style.embedTextarea}
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="HTML 코드를 붙여넣으세요..."
              rows={12}
            />
            <div className={style.embedInfo}>
              <span className={isTooLarge ? style.embedError : ""}>
                {(codeSize / 1024).toFixed(1)}KB / 50KB
              </span>
              {isTooLarge && (
                <span className={style.embedError}>
                  코드가 너무 큽니다. 파일로 업로드하거나 코드를 줄여주세요.
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className={style.embedContent}>
            <input
              type="url"
              className={style.embedUrlInput}
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://example.com/app.html"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <p className={style.embedHint}>
              HTML 파일의 URL을 입력하세요. 업로드된 첨부파일 URL도 사용
              가능합니다.
            </p>
          </div>
        )}
      </div>
    </Popup>
  );
};

export default EmbedDialog;
