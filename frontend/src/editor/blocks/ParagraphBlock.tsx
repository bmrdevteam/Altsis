import React, { useCallback } from "react";
import style from "../editor.module.scss";
import useEditorStore from "../store/useEditorStore";
import { ParagraphBlockData } from "../types";

type Props = { blockId: string; index: number };

const ParagraphBlock = (props: Props) => {
  const block = useEditorStore((s) => s.blocks[props.index]);
  const mode = useEditorStore((s) => s.mode);

  const data = block?.data as ParagraphBlockData | undefined;

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      // Use innerHTML for rich text support
      const html = e.currentTarget.innerHTML;
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
    <div
      style={{
        fontSize: data?.fontSize,
        textAlign: data?.textAlign,
        fontWeight: data?.fontWeight,
      }}
      onInput={handleInput}
      onBlur={handleBlur}
      placeholder="입력"
      className={style.block}
      contentEditable={mode === "edit"}
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: data?.text || "" }}
    />
  );
};

export default React.memo(ParagraphBlock);
