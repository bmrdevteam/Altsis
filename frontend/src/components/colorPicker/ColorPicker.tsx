import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import style from "./colorPicker.module.scss";

const PRESET_COLORS = [
  "#4285f4", "#ea4335", "#34a853", "#fbbc04",
  "#ff6d01", "#a142f4", "#039be5", "#f538a0",
  "#7cb342", "#e67c73", "#8e24aa", "#616161",
  "#d50000", "#0b8043", "#f6bf26", "#3f51b5",
  "#33b679", "#d81b60", "#795548", "#546e7a",
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
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
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

      {open &&
        createPortal(
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
                <div
                  className={style.nativeSwatch}
                  style={{ backgroundColor: value }}
                />
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
        )}
    </div>
  );
};

export default ColorPicker;
