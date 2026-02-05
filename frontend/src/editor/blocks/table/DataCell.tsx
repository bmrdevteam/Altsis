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

const DataCell = (props: Props) => {
  const cell = useEditorStore(
    (s) =>
      (s.blocks[props.blockIndex]?.data as TableBlockData)?.table?.[props.row]?.[
        props.column
      ]
  );

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
        }
        return <React.Fragment key={index}>{dataTextElement}</React.Fragment>;
      })}
    </div>
  );
};

export default React.memo(DataCell);
