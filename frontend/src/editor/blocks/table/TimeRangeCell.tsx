import React, { useRef, useState } from "react";
import useOutsideClick from "../../../hooks/useOutsideClick";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";

type Props = {
  blockIndex: number;
  column: number;
  row: number;
};

const TimeRangeCell = (props: Props) => {
  const { saveCell, getCell } = useEditor();
  const cell = getCell(props.blockIndex, props.row, props.column);

  return (
    <div className={style.cell} style={{ textAlign: cell?.align }}>
      {cell.timeRangeStart ? cell.timeRangeStart : "00:00"}{" ~ "}
      {cell.timeRangeEnd ? cell.timeRangeEnd : "00:00"}
    </div>
  );
};

export default TimeRangeCell;
