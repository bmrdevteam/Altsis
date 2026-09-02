import { useEffect, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "./altBoard.module.scss";

type Props = {
  text: string;
};

/** 설정·필드 라벨 옆 설명 — 아이콘 클릭 시 짧은 팝오버 */
const SettingsHint = ({ text }: Props) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span className={style.settingsHintWrap} ref={rootRef}>
      <button
        type="button"
        className={style.settingsHintBtn}
        aria-label="설명 보기"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Svg type="info-circle" width="14px" height="14px" />
      </button>
      {open && (
        <span className={style.settingsHintPopover} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
};

export default SettingsHint;
