import React from "react";
import style from "../editor.module.scss";
import { useEditor } from "../functions/editorContext";

type Props = { index: number };

const ParagraphBlock = (props: Props) => {
  const { getBlock, saveBlock } = useEditor();

  const block = getBlock(props.index);

  return (
    <div
      onInput={(e: any) => {
        console.log(e.target.textContent);
        saveBlock({
          block: {
            id: block.id,
            type: block.type,
            data: { text: e.target.textContent },
          },
          update: false,
        });
      }}
      placeholder="입력"
      className={style.block}
      contentEditable
      suppressContentEditableWarning
    >
      {block.data?.text}


    </div>
  );
};

export default ParagraphBlock;
