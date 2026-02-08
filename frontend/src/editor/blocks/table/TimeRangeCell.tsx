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

const TimeRangeCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );
  const mode = useEditorStore((s) => s.mode);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    useEditorStore.setState((state) => {
      const tableData = state.blocks[props.blockIndex]?.data as TableBlockData;
      const c = tableData?.table?.[props.row]?.[props.column];
      if (c) {
        c.timeRangeStart = e.target.value;
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    useEditorStore.setState((state) => {
      const tableData = state.blocks[props.blockIndex]?.data as TableBlockData;
      const c = tableData?.table?.[props.row]?.[props.column];
      if (c) {
        c.timeRangeEnd = e.target.value;
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const timeInputStyle: React.CSSProperties = {
    border: "none",
    background: "transparent",
    flex: 1,
    fontSize: cell?.fontSize || "inherit",
    outline: "none",
    width: "45%",
  };

  // Get display text - use custom text if set, otherwise show time range
  const getDisplayText = () => {
    if (cell?.timeRangeDisplayText) {
      return cell.timeRangeDisplayText;
    }
    return `${cell?.timeRangeStart || "00:00"} ~ ${cell?.timeRangeEnd || "00:00"}`;
  };

  return (
    <div
      className={style.cell}
      style={{
        textAlign: cell?.align,
        display: "flex",
        gap: "4px",
        alignItems: "center",
      }}
    >
      {mode === "edit" ? (
        <>
          <input
            type="time"
            value={cell?.timeRangeStart || "00:00"}
            onChange={handleStartChange}
            style={timeInputStyle}
          />
          <span>~</span>
          <input
            type="time"
            value={cell?.timeRangeEnd || "00:00"}
            onChange={handleEndChange}
            style={timeInputStyle}
          />
        </>
      ) : (
        <span>{getDisplayText()}</span>
      )}
    </div>
  );
};

export default React.memo(TimeRangeCell);
