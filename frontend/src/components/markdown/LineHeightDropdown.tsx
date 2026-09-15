import { useEffect, useRef, useState } from "react";
import style from "./markdown.module.scss";
import {
  DEFAULT_LINE_HEIGHT,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_PRESETS,
  clampLineHeight,
} from "./blockLineHeight";

type Props = {
  current: number | null;
  onSelect: (lineHeight: number | null) => void;
  onClose: () => void;
};

const LineHeightDropdown = ({ current, onSelect, onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const selected = clampLineHeight(current);
  const [custom, setCustom] = useState(
    selected != null ? String(selected) : ""
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
    const n = clampLineHeight(Number(custom));
    if (n == null) return;
    onSelect(n);
    onClose();
  };

  return (
    <div
      className={style.headingDropdown}
      ref={ref}
      data-editor-popup
      onMouseDown={(e) => e.preventDefault()}
    >
      {LINE_HEIGHT_PRESETS.map((n) => (
        <button
          key={n}
          type="button"
          className={`${style.headingDropdownItem} ${
            selected === n ? style.headingDropdownItemActive : ""
          }`}
          onClick={() => {
            onSelect(n);
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
          min={LINE_HEIGHT_MIN}
          max={LINE_HEIGHT_MAX}
          step={0.05}
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
        기본 ({DEFAULT_LINE_HEIGHT})
      </button>
    </div>
  );
};

export default LineHeightDropdown;
