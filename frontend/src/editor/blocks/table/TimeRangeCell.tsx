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

const formatTime = (time: string) => {
  if (!time) return "00:00";
  return time;
};

const TimeRangeCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );

  const displayText = cell?.timeRangeDisplayText
    || `${formatTime(cell?.timeRangeStart || "")} ~ ${formatTime(cell?.timeRangeEnd || "")}`;

  return (
    <div
      className={style.cell}
      style={{ textAlign: cell?.align }}
    >
      {displayText}
    </div>
  );
};

export default React.memo(TimeRangeCell);
