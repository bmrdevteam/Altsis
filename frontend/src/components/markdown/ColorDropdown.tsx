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
];

type Props = {
  onSelect: (color: string | null) => void;
  onClose: () => void;
  currentColor?: string;
};

const ColorDropdown = ({ onSelect, onClose, currentColor }: Props) => {
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

  return (
    <div className={style.colorDropdown} ref={ref}>
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
      <button
        type="button"
        className={style.colorRemoveBtn}
        onClick={() => onSelect(null)}
      >
        없음
      </button>
    </div>
  );
};

export default ColorDropdown;
