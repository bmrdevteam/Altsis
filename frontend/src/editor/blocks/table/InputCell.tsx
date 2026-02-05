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

const InputCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );

  // In editor mode, InputCell shows the placeholder text as a preview.
  // Actual input functionality is in the parsed form (ParsedTableBlock).
  const placeholderText =
    cell?.placeholder && cell.placeholder !== " "
      ? cell.placeholder
      : "입력";

  return (
    <div
      className={`${style.cell} ${style.input}`}
      style={{
        textAlign: cell?.align,
        color: "var(--accent-4)",
        fontSize: cell?.fontSize,
      }}
    >
      {placeholderText}
    </div>
  );
};

export default React.memo(InputCell);
