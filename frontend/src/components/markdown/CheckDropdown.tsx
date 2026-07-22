import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor;
  onClose: () => void;
};

const CheckDropdown = ({ editor, onClose }: Props) => {
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
          editor.isActive("taskList") ? style.headingDropdownItemActive : ""
        }`}
        onClick={() => {
          editor.chain().focus().toggleTaskList().run();
          onClose();
        }}
      >
        블록 체크박스
      </button>
      <button
        type="button"
        className={`${style.headingDropdownItem} ${
          editor.isActive("inlineCheckbox")
            ? style.headingDropdownItemActive
            : ""
        }`}
        onClick={() => {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "inlineCheckbox",
              attrs: { checked: false },
            })
            .run();
          onClose();
        }}
      >
        인라인 체크박스
      </button>
    </div>
  );
};

export default CheckDropdown;
