import React from "react";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
type Props = {
  blockIndex: number;
  column: number;
  row: number;
};

const DataCell = (props: Props) => {
  const { getCell } = useEditor();
  const cell = getCell(props.blockIndex, props.row, props.column);
  return (
    <div className={style.cell} style={{ textAlign: cell?.align }}>
      {cell?.dataText?.map((dataTextElement: any, index: number) => {
        if (typeof dataTextElement === "object") {
          if (dataTextElement.tag === "DATA") {
            const arr = dataTextElement.location?.split("/");
            return (
              <data
                key={index}
                className={style.data}
                data-location={dataTextElement.location}
              >
                {arr ? arr[arr.length - 1] : ""}
              </data>
            );
          }
          if (dataTextElement.tag === "BR") {
            return <br key={index} />;
          }
        } else {
          return dataTextElement;
        }
      })}
    </div>
  );
};

export default DataCell;
