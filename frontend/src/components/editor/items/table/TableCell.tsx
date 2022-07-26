import React, { useRef, useState } from "react";
import style from "./editorTable.module.scss";
const TableCell = ({
  children,
  row,
  rowSpan,
  col,
  colSpan,
}: {
  children?: JSX.Element | string;
  row?: number;
  col?: number;
  rowSpan?: number;
  colSpan?: number;
  width?: string;
  height?: string;
  background?: string;
  border?: string;
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const textRef = useRef<HTMLDivElement>(null);
  let prevWidth: number;
  let prevHeight: number;
  let currX: number;
  let currY: number;

  function handleMouseMoveX(e: MouseEvent) {
    textRef.current!.style.width = `${prevWidth + e.clientX - currX}px`;
  }
  function handleMouseMoveY(e: MouseEvent) {
    textRef.current!.style.height = `${prevHeight + e.clientY - currY}px`;
  }
  function handleMouseUp() {
    document.removeEventListener("mousemove", handleMouseMoveX);
    document.removeEventListener("mousemove", handleMouseMoveY);
  }

  document.addEventListener("mouseup", handleMouseUp);
  return (
    <div
      className={style.table_cell}
      style={{
        gridColumn: `${col ? col : "unset"} / span ${colSpan ? colSpan : 1}`,
        gridRow: `${row ? row : "unset"} /span ${rowSpan ? rowSpan : 1}`,
      }}
    >
      <div
        className={style.content}
        ref={textRef}
        onDrag={() => {
          setIsDragging(true);
        }}
        onDragEnd={() => {
          setIsDragging(false);
        }}
      >
        {children}
      </div>
      <div
        onMouseDown={(e) => {
          if (!isDragging) {
            currX = e.clientX;
            prevWidth = textRef.current!.clientWidth;
            document.addEventListener("mousemove", handleMouseMoveX);
          }
        }}
        className={style.col_resize}
      ></div>
      <div
        onMouseDown={(e) => {
          if (!isDragging) {
            currY = e.clientY;
            prevHeight = textRef.current!.clientHeight;
            document.addEventListener("mousemove", handleMouseMoveY);
          }
        }}
        className={style.row_resize}
      ></div>
    </div>
  );
};

export default TableCell;
