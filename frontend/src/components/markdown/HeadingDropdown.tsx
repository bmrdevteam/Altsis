import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor;
  onClose: () => void;
};

const OPTIONS: {
  label: string;
  value: "paragraph" | 1 | 2 | 3;
}[] = [
  { label: "본문", value: "paragraph" },
  { label: "제목 1", value: 1 },
  { label: "제목 2", value: 2 },
  { label: "제목 3", value: 3 },
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

  const isActive = (value: "paragraph" | 1 | 2 | 3) => {
    if (value === "paragraph") {
      return (
        editor.isActive("paragraph") &&
        !editor.isActive("heading")
      );
    }
    return editor.isActive("heading", { level: value });
  };

  const apply = (value: "paragraph" | 1 | 2 | 3) => {
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
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default HeadingDropdown;
