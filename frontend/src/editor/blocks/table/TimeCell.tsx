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

const TimeCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );
  const mode = useEditorStore((s) => s.mode);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className={style.cell} style={{ textAlign: cell?.align }}>
      {mode === "edit" ? (
        <input
          type="time"
          value={cell?.data?.text || "00:00"}
          onChange={handleChange}
          style={{
            border: "none",
            background: "transparent",
            width: "100%",
            fontSize: cell?.fontSize || "inherit",
            textAlign: cell?.align || "center",
            outline: "none",
          }}
        />
      ) : (
        <span>{cell?.data?.text || "00:00"}</span>
      )}
    </div>
  );
};

export default React.memo(TimeCell);
