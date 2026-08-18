import { useEffect, useRef, useState } from "react";
import style from "./markdown.module.scss";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_PRESETS,
  clampFontSizePx,
  formatFontSizePx,
} from "./editorFonts";

type Props = {
  currentPx: number | null;
  onSelect: (size: string | null) => void;
  onClose: () => void;
};

const FontSizeDropdown = ({ currentPx, onSelect, onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState(
    currentPx != null ? String(currentPx) : ""
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const applyCustom = () => {
    const n = clampFontSizePx(Number(custom));
    if (n == null) return;
    onSelect(formatFontSizePx(n));
    onClose();
  };

  return (
    <div
      className={style.headingDropdown}
      ref={ref}
      data-editor-popup
      onMouseDown={(e) => e.preventDefault()}
    >
      {FONT_SIZE_PRESETS.map((n) => (
        <button
          key={n}
          type="button"
          className={`${style.headingDropdownItem} ${
            currentPx === n ? style.headingDropdownItemActive : ""
          }`}
          onClick={() => {
            onSelect(formatFontSizePx(n));
            onClose();
          }}
        >
          {n}
        </button>
      ))}
      <label className={style.fontCustomRow}>
        <span>직접 입력</span>
        <input
          type="number"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          className={style.fontCustomInput}
          value={custom}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyCustom();
            }
          }}
        />
      </label>
      <button
        type="button"
        className={style.colorRemoveBtn}
        onClick={() => {
          onSelect(null);
          onClose();
        }}
      >
        없음
      </button>
    </div>
  );
};

export default FontSizeDropdown;
