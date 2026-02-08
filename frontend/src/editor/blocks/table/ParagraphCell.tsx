import React, { useCallback, useRef, useLayoutEffect } from "react";
import style from "../../editor.module.scss";
import useEditorStore from "../../store/useEditorStore";
import { TableBlockData } from "../../types";

type Props = {
  blockId: string;
  blockIndex: number;
  column: number;
  row: number;
};

const ParagraphCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );
  const mode = useEditorStore((s) => s.mode);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTextRef = useRef<string>("");

  // Sync content from store only when not focused (external changes)
  useLayoutEffect(() => {
    if (contentRef.current) {
      const newText = cell?.data?.text || "";
      if (
        lastTextRef.current !== newText &&
        document.activeElement !== contentRef.current
      ) {
        contentRef.current.innerHTML = newText;
        lastTextRef.current = newText;
      }
    }
  }, [cell?.data?.text]);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const html = e.currentTarget.innerHTML;
      lastTextRef.current = html;
      useEditorStore.setState((state) => {
        const tableData = state.blocks[props.blockIndex]?.data as TableBlockData;
        const c = tableData?.table?.[props.row]?.[props.column];
        if (c) {
          if (!c.data) c.data = {};
          c.data.text = html;
        }
      });
    },
    [props.blockIndex, props.row, props.column]
  );

  const handleBlur = useCallback(() => {
    useEditorStore.getState().saveSnapshot();
  }, []);

  return (
    <div
      ref={contentRef}
      contentEditable={mode === "edit"}
      suppressContentEditableWarning
      className={style.cell}
      style={{ textAlign: cell?.align }}
      onInput={handleInput}
      onBlur={handleBlur}
    />
  );
};

export default React.memo(ParagraphCell);
