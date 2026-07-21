import { useState } from "react";
import Popup from "components/popup/Popup";
import { extractYouTubeId } from "./extensions/youtube";
import style from "./markdown.module.scss";

type Props = {
  onSubmit: (src: string) => void;
  onClose: () => void;
};

const YouTubeInsertDialog = ({ onSubmit, onClose }: Props) => {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const videoId = extractYouTubeId(trimmed);
    if (!videoId) {
      alert("유효한 YouTube URL이 아닙니다.");
      return;
    }
    onSubmit(`https://www.youtube.com/watch?v=${videoId}`);
    onClose();
  };

  return (
    <Popup
      title="YouTube 삽입"
      setState={onClose}
      closeBtn
      style={{ maxWidth: "480px", width: "100%" }}
      footer={
        <div className={style.embedDialogFooter}>
          <button
            type="button"
            className={style.embedDialogBtn}
            onClick={handleSubmit}
            disabled={!url.trim()}
          >
            삽입
          </button>
        </div>
      }
    >
      <div className={style.embedDialog}>
        <input
          className={style.embedUrlInput}
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
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
          YouTube 영상 URL을 입력하세요. (일반 영상, Shorts 지원)
        </p>
      </div>
    </Popup>
  );
};

export default YouTubeInsertDialog;
