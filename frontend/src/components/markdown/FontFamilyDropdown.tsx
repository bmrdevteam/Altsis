import { useEffect, useRef } from "react";
import style from "./markdown.module.scss";
import { FONT_OPTIONS, canonicalFontFamily } from "./editorFonts";

type Props = {
  currentFamily: string | null;
  onSelect: (family: string | null) => void;
  onClose: () => void;
};

const FontFamilyDropdown = ({ currentFamily, onSelect, onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const active = canonicalFontFamily(currentFamily);

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
      className={style.headingDropdown}
      ref={ref}
      data-editor-popup
      onMouseDown={(e) => e.preventDefault()}
    >
      {FONT_OPTIONS.map((opt) => {
        const isActive = opt.family == null ? !active : active === opt.family;
        return (
          <button
            key={opt.id}
            type="button"
            className={`${style.headingDropdownItem} ${
              isActive ? style.headingDropdownItemActive : ""
            }`}
            style={opt.family ? { fontFamily: opt.family } : undefined}
            onClick={() => {
              onSelect(opt.family);
              onClose();
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default FontFamilyDropdown;
