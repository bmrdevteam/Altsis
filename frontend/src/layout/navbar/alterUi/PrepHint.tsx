import { useEffect, useRef, useState } from "react";
import Svg from "assets/svg/Svg";
import style from "../Alter.module.scss";

/** 설명 아이콘 — 클릭 시에만 안내 문구 표시 */
const PrepHint = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span className={style.prepHintWrap} ref={rootRef}>
      <button
        type="button"
        className={style.prepHintBtn}
        aria-label="설명 보기"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Svg type="info-circle" width="13px" height="13px" />
      </button>
      {open && (
        <span className={style.prepHintPopover} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
};

export default PrepHint;
