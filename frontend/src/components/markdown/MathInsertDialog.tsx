import { useState } from "react";
import Popup from "components/popup/Popup";
import style from "./markdown.module.scss";

type Props = {
  onSubmit: (latex: string, mode: "inline" | "block") => void;
  onClose: () => void;
  initialLatex?: string;
  initialMode?: "inline" | "block";
  /** 편집 시 모드 전환 숨김 */
  lockMode?: boolean;
  title?: string;
  submitLabel?: string;
};

const MathInsertDialog = ({
  onSubmit,
  onClose,
  initialLatex = "E = mc^2",
  initialMode = "inline",
  lockMode = false,
  title = "수식 삽입",
  submitLabel = "삽입",
}: Props) => {
  const [latex, setLatex] = useState(initialLatex);
  const [mode, setMode] = useState<"inline" | "block">(initialMode);

  const handleSubmit = () => {
    const trimmed = latex.trim();
    if (!trimmed) return;
    onSubmit(trimmed, mode);
    onClose();
  };

  return (
    <Popup
      title={title}
      setState={onClose}
      closeBtn
      style={{ maxWidth: "480px", width: "100%" }}
      footer={
        <div className={style.embedDialogFooter}>
          <button
            type="button"
            className={style.embedDialogBtn}
            onClick={handleSubmit}
            disabled={!latex.trim()}
          >
            {submitLabel}
          </button>
        </div>
      }
    >
      <div className={style.embedDialog}>
        {!lockMode && (
          <div className={style.embedTabs}>
            <button
              type="button"
              className={mode === "inline" ? style.active : ""}
              onClick={() => setMode("inline")}
            >
              인라인
            </button>
            <button
              type="button"
              className={mode === "block" ? style.active : ""}
              onClick={() => setMode("block")}
            >
              블록
            </button>
          </div>
        )}
        <input
          className={style.embedUrlInput}
          type="text"
          placeholder="E = mc^2"
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          autoFocus
        />
        <p className={style.embedHint}>
          {lockMode
            ? "LaTeX 수식을 수정하세요."
            : "LaTeX 수식을 입력하세요. 인라인은 문장 안, 블록은 별도 줄에 표시됩니다."}
        </p>
      </div>
    </Popup>
  );
};

export default MathInsertDialog;
