import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import style from "./markdown.module.scss";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingValue = "paragraph" | HeadingLevel;

type Props = {
  editor: Editor;
  onClose: () => void;
};

const OPTIONS: {
  label: string;
  value: HeadingValue;
  previewSize?: string;
}[] = [
  { label: "본문", value: "paragraph", previewSize: "14px" },
  { label: "제목 1", value: 1, previewSize: "2em" },
  { label: "제목 2", value: 2, previewSize: "1.5em" },
  { label: "제목 3", value: 3, previewSize: "1.25em" },
  { label: "제목 4", value: 4, previewSize: "1.125em" },
  { label: "제목 5", value: 5, previewSize: "1em" },
  { label: "제목 6", value: 6, previewSize: "0.875em" },
];

const HeadingDropdown = ({ editor, onClose }: Props) => {
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

  const isActive = (value: HeadingValue) => {
    if (value === "paragraph") {
      return editor.isActive("paragraph") && !editor.isActive("heading");
    }
    return editor.isActive("heading", { level: value });
  };

  const apply = (value: HeadingValue) => {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: value }).run();
    }
    onClose();
  };

  return (
    <div className={style.headingDropdown} ref={ref} data-editor-popup>
      {OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className={`${style.headingDropdownItem} ${
            isActive(opt.value) ? style.headingDropdownItemActive : ""
          }`}
          onClick={() => apply(opt.value)}
          style={
            opt.previewSize
              ? { fontSize: `min(${opt.previewSize}, 18px)` }
              : undefined
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export const getHeadingBadge = (editor: Editor): string | null => {
  for (let level = 1; level <= 6; level += 1) {
    if (editor.isActive("heading", { level })) return String(level);
  }
  return null;
};

export default HeadingDropdown;
