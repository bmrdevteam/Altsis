import { isArray } from "lodash";
import React, { useEffect } from "react";
import useGenerateId from "../../../hooks/useGenerateId";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import TableCellBlock from "./ParagraphCell";

type Props = { index: number };

const TableBlock = (props: Props) => {
  const { result, changeBlockData, getBlock, setCurrentCell } = useEditor();
  const generate = useGenerateId;
  const block = getBlock(props.index);

  const tableStyles = {};

  /**
   * setup table data
   *
   * [[1,2,3],[4,5,6]]
   */
  useEffect(() => {
    if (
      getBlock(props.index).data?.table === undefined ||
      !isArray(getBlock(props.index).data?.table)
    ) {
      const tableId = block.id.split("-")[block.id.split("-").length - 1];

      changeBlockData(props.index, {
        table: [
          [
            {
              id: `${tableId}-${generate(12)}`,
              data: { text: "" },
              type: "paragraph",
            },
            {
              id: `${tableId}-${generate(12)}`,
              data: { text: "" },
              type: "paragraph",
            },
            {
              id: `${tableId}-${generate(12)}`,
              data: { text: "" },
              type: "paragraph",
            },
          ],
          [
            {
              id: `${tableId}-${generate(12)}`,
              data: { text: "" },
              type: "checkbox",
            },
            {
              id: `${tableId}-${generate(12)}`,
              data: { text: "" },
              type: "input",
            },
            {
              id: `${tableId}-${generate(12)}`,
              data: { text: "" },
              type: "select",
            },
          ],
        ],
      });
    }
  }, []);
  const SetColumn = () => {
    let result = [];
    for (let i = 0; i < 20; i++) {
      result.push(<col width="5%" key={i} />);
    }
    return <colgroup>{result}</colgroup>;
  };

  return (
    <div className={style.block}>
      <table className={style.table}>
        <SetColumn />
        <tbody>
          {block.data.table?.map((value: any, index: number) => {
            return (
              <tr key={index}>
                {value.map((val: any, ind: number) => {
                  return (
                    <td
                      key={ind}
                      id={val.id}
                      onClick={() => {
                        setCurrentCell(val.id);
                        console.log(val.id);
                      }}
                      colSpan={val.data?.colSpan}
                      rowSpan={val.data?.rowSpan}
                    >
                      <TableCellBlock />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TableBlock;
