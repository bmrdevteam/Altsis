import { useEffect, useRef } from "react";
import {
  BORDER_STYLES,
  BORDER_WIDTHS,
} from "./tableCellAttributes";
import style from "./markdown.module.scss";

type Props = {
  borderColor?: string | null;
  borderStyle?: string | null;
  borderWidth?: string | null;
  onChangeColor: (color: string | null) => void;
  onChangeStyle: (borderStyle: string | null) => void;
  onChangeWidth: (borderWidth: string | null) => void;
  onReset: () => void;
  onClose: () => void;
};

const PRESET_COLORS = [
  "#000000",
  "#6B7280",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#A855F7",
];

const TableBorderDropdown = ({
  borderColor,
  borderStyle,
  borderWidth,
  onChangeColor,
  onChangeStyle,
  onChangeWidth,
  onReset,
  onClose,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const currentStyle = borderStyle || "solid";
  const currentWidth = borderWidth || "1px";
  const pickerValue =
    borderColor && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(borderColor)
      ? borderColor
      : "#000000";

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
    <div
      className={style.tableBorderDropdown}
      ref={ref}
      data-editor-popup
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className={style.tableBorderSection}>
        <div className={style.tableBorderLabel}>모양</div>
        <div className={style.tableBorderStyleRow}>
          {BORDER_STYLES.map((item) => (
            <button
              key={item.value}
              type="button"
              title={item.label}
              className={`${style.tableBorderStyleBtn} ${
                currentStyle === item.value ? style.tableBorderStyleBtnActive : ""
              }`}
              onClick={() => onChangeStyle(item.value)}
            >
              <span
                className={style.tableBorderStylePreview}
                style={{
                  borderBottomStyle: item.value === "none" ? "solid" : item.value,
                  borderBottomWidth: item.value === "none" ? 0 : 2,
                  opacity: item.value === "none" ? 0.35 : 1,
                }}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={style.tableBorderSection}>
        <div className={style.tableBorderLabel}>두께</div>
        <div className={style.tableBorderWidthRow}>
          {BORDER_WIDTHS.map((item) => (
            <button
              key={item.value}
              type="button"
              title={item.label}
              className={`${style.tableBorderWidthBtn} ${
                currentWidth === item.value ? style.tableBorderWidthBtnActive : ""
              }`}
              onClick={() => onChangeWidth(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={style.tableBorderSection}>
        <div className={style.tableBorderLabel}>색상</div>
        <div className={style.colorGrid}>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`${style.colorSwatch} ${
                borderColor === color ? style.colorSwatchActive : ""
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onChangeColor(color)}
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
            onChange={(e) => onChangeColor(e.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className={style.colorRemoveBtn}
        onClick={onReset}
      >
        테두리 초기화
      </button>
    </div>
  );
};

export default TableBorderDropdown;
