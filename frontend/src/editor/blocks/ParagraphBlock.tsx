import React, { useCallback, useRef, useLayoutEffect } from "react";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";
import { ParagraphBlockData } from "../types";

type Props = { blockId: string; index: number };

const ParagraphBlock = (props: Props) => {
  const block = useEditorStore((s) => s.blocks[props.index]);
  const mode = useEditorStore((s) => s.mode);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTextRef = useRef<string>("");

  const data = block?.data as ParagraphBlockData | undefined;

  // Sync content from store only when not focused (external changes)
  useLayoutEffect(() => {
    if (contentRef.current) {
      const newText = data?.text || "";
      // Only update if text changed externally and element is not focused
      if (
        lastTextRef.current !== newText &&
        document.activeElement !== contentRef.current
      ) {
        contentRef.current.innerHTML = newText;
        lastTextRef.current = newText;
      }
    }
  }, [data?.text]);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const html = e.currentTarget.innerHTML;
      lastTextRef.current = html;
      useEditorStore.setState((state) => {
        const b = state.blocks[props.index];
        if (b) {
          (b.data as ParagraphBlockData).text = html;
        }
      });
    },
    [props.index]
  );

  const handleBlur = useCallback(() => {
    useEditorStore.getState().saveSnapshot();
  }, []);

  if (!block) return null;

  return (
    <div className={style.block} style={{ display: "flex", alignItems: "center" }}>
      <div
        ref={contentRef}
        style={{
          fontSize: data?.fontSize,
          textAlign: data?.textAlign,
          fontWeight: data?.fontWeight,
          fontFamily: data?.fontFamily,
          width: "100%",
          outline: "none",
        }}
        onInput={handleInput}
        onBlur={handleBlur}
        placeholder="입력"
        contentEditable={mode === "edit"}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default React.memo(ParagraphBlock);
