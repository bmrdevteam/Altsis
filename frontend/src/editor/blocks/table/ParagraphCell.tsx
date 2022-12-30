import React from "react";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
type Props = {
  blockIndex: number;
  column: number;
  row: number;
};

const ParagraphCell = (props: Props) => {
  const { saveCell, getCell } = useEditor();
  const cell = getCell(props.blockIndex, props.row, props.column);
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      className={style.cell}
      style={{ textAlign: cell?.align }}
      onInput={(e) => {
        saveCell(props.blockIndex, props.row, props.column, {
          data: { text: e.currentTarget.textContent },
        });
      }}
     
    >
      {cell.data?.text}
    </div>
  );
};

export default ParagraphCell;
