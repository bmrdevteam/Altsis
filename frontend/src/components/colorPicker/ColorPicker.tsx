import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import style from "./colorPicker.module.scss";

// 10 columns x 5 rows: hue spectrum with lightness variations
const PRESET_COLORS = [
  // Row 1: light
  "#ffcdd2", "#f8bbd0", "#e1bee7", "#c5cae9", "#bbdefb",
  "#b2ebf2", "#b2dfdb", "#c8e6c9", "#fff9c4", "#ffe0b2",
  // Row 2: medium-light
  "#ef9a9a", "#f48fb1", "#ce93d8", "#9fa8da", "#90caf9",
  "#80deea", "#80cbc4", "#a5d6a7", "#fff176", "#ffcc80",
  // Row 3: medium
  "#ef5350", "#ec407a", "#ab47bc", "#5c6bc0", "#42a5f5",
  "#26c6da", "#26a69a", "#66bb6a", "#ffee58", "#ffa726",
  // Row 4: dark
  "#c62828", "#ad1457", "#6a1b9a", "#283593", "#1565c0",
  "#00838f", "#00695c", "#2e7d32", "#f9a825", "#e65100",
  // Row 5: neutrals
  "#000000", "#424242", "#616161", "#9e9e9e", "#bdbdbd",
  "#e0e0e0", "#f5f5f5", "#ffffff", "#795548", "#455a64",
];

type Props = {
  label?: string;
  value: string;
  onChange: (color: string) => void;
};

const ColorPicker = ({ label, value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  useEffect(() => {
    const handleMousedown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMousedown);
    return () => document.removeEventListener("mousedown", handleMousedown);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    // Use rAF to ensure portal DOM is painted before measuring
    const id = requestAnimationFrame(() => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      const dropdownHeight = dropdown ? dropdown.offsetHeight : 250;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      const top =
        spaceBelow >= dropdownHeight + 4 || spaceBelow >= spaceAbove
          ? triggerRect.bottom + 4
          : triggerRect.top - dropdownHeight - 4;

      setDropdownPos({ top, left: triggerRect.left });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const handlePresetClick = (color: string) => {
    onChange(color);
    setOpen(false);
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onChange(val);
    }
  };

  const handleNativeChange = (val: string) => {
    onChange(val);
    setHexInput(val);
  };

  const dropdownPortal: any = open
    ? createPortal(
        <div
          className={style.dropdown}
          ref={dropdownRef}
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className={style.presets}>
            {PRESET_COLORS.map((c) => (
              <div
                key={c}
                className={`${style.preset} ${value === c ? style.selected : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => handlePresetClick(c)}
              />
            ))}
          </div>

          <div className={style.divider} />

          <div className={style.custom}>
            <label className={style.nativeWrapper}>
              <input
                type="color"
                value={value}
                onChange={(e) => handleNativeChange(e.target.value)}
                className={style.nativeInput}
              />
              <span className={style.nativeLabel}>색상 선택</span>
            </label>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              className={style.hexInput}
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={style.container} ref={containerRef}>
      {label && <label className={style.label}>{label}</label>}
      <div
        className={style.trigger}
        ref={triggerRef}
        onClick={() => setOpen((p) => !p)}
      >
        <div
          className={style.swatch}
          style={{ backgroundColor: value }}
        />
      </div>
      {dropdownPortal}
    </div>
  );
};

export default ColorPicker;
