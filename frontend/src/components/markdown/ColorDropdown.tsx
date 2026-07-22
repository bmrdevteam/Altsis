import { useEffect, useRef } from "react";
import style from "./markdown.module.scss";

const PRESET_COLORS = [
  "#EF4444", // 빨강
  "#F97316", // 주황
  "#EAB308", // 노랑
  "#22C55E", // 초록
  "#3B82F6", // 파랑
  "#6366F1", // 남색
  "#A855F7", // 보라
  "#6B7280", // 회색
  "#000000", // 검정
  "#FFFFFF", // 흰색
  "#EC4899", // 분홍
  "#14B8A6", // 청록
];

type Props = {
  onSelect: (color: string | null) => void;
  onClose: () => void;
  currentColor?: string;
  hint?: string;
};

const ColorDropdown = ({ onSelect, onClose, currentColor, hint }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const pickerValue =
    currentColor && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(currentColor)
      ? currentColor
      : "#3B82F6";

  return (
    <div
      className={style.colorDropdown}
      ref={ref}
      data-editor-popup
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className={style.colorGrid}>
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`${style.colorSwatch} ${
              currentColor === color ? style.colorSwatchActive : ""
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onSelect(color)}
            title={color}
          />
        ))}
      </div>
      <label className={style.colorPickerRow}>
        <span>직접 선택</span>
        <input
          type="color"
          className={style.colorPickerInput}
          value={pickerValue}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onSelect(e.target.value)}
        />
      </label>
      <button
        type="button"
        className={style.colorRemoveBtn}
        onClick={() => onSelect(null)}
      >
        없음
      </button>
      {hint && <p className={style.colorDropdownHint}>{hint}</p>}
    </div>
  );
};

export default ColorDropdown;
