import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { createMarkdownExtensions } from "./createMarkdownExtensions";
import { transformSpecialNodes } from "./extensions/youtube";
import { repairCanvasMarkdown } from "./canvas/canvasModel";
import style from "./markdown.module.scss";
import "katex/dist/katex.min.css";

type Props = {
  content: string;
  className?: string;
};

/**
 * MarkdownEditor와 같은 TipTap 스키마·표 NodeView로 문서를 읽기 전용 렌더한다.
 * 기안문처럼 표 너비가 편집 화면과 같아야 하는 결과 화면에 쓴다.
 */
const MarkdownWysiwygView = ({ content, className }: Props) => {
  const repaired = repairCanvasMarkdown(content || "");
  const lastContentRef = useRef(repaired);

  const editor = useEditor({
    editable: false,
    shouldRerenderOnTransaction: false,
    extensions: createMarkdownExtensions({ editable: false }),
    content: repaired,
    editorProps: {
      attributes: {
        tabindex: "-1",
        "aria-readonly": "true",
      },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    transformSpecialNodes(editor);
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = repairCanvasMarkdown(content || "");
    if (next === lastContentRef.current) return;
    lastContentRef.current = next;
    editor.commands.setContent(next);
    transformSpecialNodes(editor);
  }, [content, editor]);

  return (
    <div
      className={`${style.tiptapContent} ${style.tiptapReadonly}${
        className ? ` ${className}` : ""
      }`}
    >
      <EditorContent editor={editor} />
    </div>
  );
};

export default MarkdownWysiwygView;
