import React from "react";
import { useEditor } from "../../functions/editorContext";
import style from "../../editor.module.scss";

type Props = {
  blockIndex: number;
  column: number;
  row: number;
};

const CheckBoxCell = (props: Props) => {
  const { saveCell, getCell } = useEditor();
  const cell = getCell(props.blockIndex, props.row, props.column);
  return (
    <div
      style={{ display: "flex", justifyContent: cell?.align }}
      className={style.cell}
    >
      <input
        type="checkbox"
        defaultChecked={cell?.checked}
        onChange={(e) => {
          saveCell(props.blockIndex, props.row, props.column, {
            checked: e.target.checked,
          });
        }}
      />
    </div>
  );
};

export default CheckBoxCell;
