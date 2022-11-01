import { useEditor } from "editor/functions/editorContext";
import React from "react";
import style from "../../editor.module.scss";

type Props = {
  blockIndex: number;
  column: number;
  row: number;
};

const SelectCell = (props: Props) => {
  const { getCell } = useEditor();
  const cell = getCell(props.blockIndex, props.row, props.column);
  return (
    <div
      className={`${style.cell} ${style.select}`}
      style={{ textAlign: cell?.align }}
    >
      <select>
        {cell?.options?.map((value: any) => {
          return (
            <option key={value.id} value={value.value}>
              {value.text}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default SelectCell;
