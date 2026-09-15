import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

/** 툴바가 트랜잭션마다 최신 can()/isActive()를 읽도록 리렌더한다. */
export const useEditorChromeTick = (editor: Editor | null) => {
  const [, setRev] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const bump = () => setRev((n) => n + 1);
    editor.on("transaction", bump);
    editor.on("selectionUpdate", bump);
    return () => {
      editor.off("transaction", bump);
      editor.off("selectionUpdate", bump);
    };
  }, [editor]);
};
