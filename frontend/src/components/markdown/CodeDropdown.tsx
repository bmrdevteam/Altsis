import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor;
  onClose: () => void;
};

const CodeDropdown = ({ editor, onClose }: Props) => {
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
    <div
      className={style.headingDropdown}
      ref={ref}
      data-editor-popup
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className={`${style.headingDropdownItem} ${
          editor.isActive("code") ? style.headingDropdownItemActive : ""
        }`}
        onClick={() => {
          editor.chain().focus().toggleCode().run();
          onClose();
        }}
      >
        인라인 코드
      </button>
      <button
        type="button"
        className={`${style.headingDropdownItem} ${
          editor.isActive("codeBlock") ? style.headingDropdownItemActive : ""
        }`}
        onClick={() => {
          editor.chain().focus().toggleCodeBlock().run();
          onClose();
        }}
      >
        코드 블록
      </button>
    </div>
  );
};

export default CodeDropdown;
