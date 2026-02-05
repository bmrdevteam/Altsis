import React from "react";
import style from "../../editor.module.scss";
import useEditorStore from "../../store/useEditorStore";
import { TableBlockData } from "../../types";

type Props = {
  blockId: string;
  blockIndex: number;
  column: number;
  row: number;
};

const CheckBoxCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    useEditorStore.setState((state) => {
      const tableData = state.blocks[props.blockIndex]?.data as TableBlockData;
      const c = tableData?.table?.[props.row]?.[props.column];
      if (c) {
        c.checked = e.target.checked;
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  return (
    <div
      style={{ display: "flex", justifyContent: cell?.align }}
      className={style.cell}
    >
      <input
        type="checkbox"
        defaultChecked={cell?.checked}
        onChange={handleChange}
      />
    </div>
  );
};

export default React.memo(CheckBoxCell);
