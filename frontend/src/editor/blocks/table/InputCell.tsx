import { useEditor } from "editor/functions/editorContext";
import React from "react";
import style from "../../editor.module.scss";

type Props = {
  blockIndex: number;
  column: number;
  row: number;
};

const InputCell = (props: Props) => {
  const { getCell } = useEditor();
  const cell = getCell(props.blockIndex, props.row, props.column);
  return (
    <div
      className={`${style.cell} ${style.input}`}
      style={{ textAlign: cell?.align }}
      placeholder={
        cell?.placeholder || cell?.placeholder === ""
          ? cell?.placeholder
          : "입력"
      }
    >
      {cell.data?.text}
    </div>
  );
};

export default InputCell;
