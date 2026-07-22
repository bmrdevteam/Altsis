import { useState } from "react";
import Popup from "components/popup/Popup";
import style from "./markdown.module.scss";

type Props = {
  initialUrl?: string;
  hasExistingLink?: boolean;
  onSubmit: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

const LinkInsertDialog = ({
  initialUrl = "",
  hasExistingLink = false,
  onSubmit,
  onRemove,
  onClose,
}: Props) => {
  const [url, setUrl] = useState(initialUrl || "https://");

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <Popup
      title="링크"
      setState={onClose}
      closeBtn
      style={{ maxWidth: "480px", width: "100%" }}
      footer={
        <div className={style.embedDialogFooter}>
          {hasExistingLink && (
            <button
              type="button"
              className={style.embedDialogBtnSecondary}
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              링크 제거
            </button>
          )}
          <button
            type="button"
            className={style.embedDialogBtn}
            onClick={handleSubmit}
            disabled={!url.trim()}
          >
            적용
          </button>
        </div>
      }
    >
      <div className={style.embedDialog}>
        <input
          className={style.embedUrlInput}
          type="url"
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          autoFocus
        />
        <p className={style.embedHint}>
          선택한 텍스트에 연결할 URL을 입력하세요.
        </p>
      </div>
    </Popup>
  );
};

export default LinkInsertDialog;
