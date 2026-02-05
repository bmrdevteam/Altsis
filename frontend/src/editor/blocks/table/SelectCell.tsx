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

const SelectCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    useEditorStore.setState((state) => {
      const tableData = state.blocks[props.blockIndex]?.data as TableBlockData;
      const c = tableData?.table?.[props.row]?.[props.column];
      if (c) {
        if (!c.data) c.data = {};
        c.data.text = e.target.value;
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  return (
    <div className={`${style.cell} ${style.select}`}>
      <select
        style={{ textAlign: cell?.align, fontSize: cell?.fontSize }}
        value={cell?.data?.text || ""}
        onChange={handleChange}
      >
        <option value="">선택</option>
        {cell?.options?.map((value) => (
          <option key={value.id} value={value.value}>
            {value.text}
          </option>
        ))}
      </select>
    </div>
  );
};

export default React.memo(SelectCell);
