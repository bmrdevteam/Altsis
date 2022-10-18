import { isArray } from "lodash";
import { useEffect } from "react";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import CheckBoxCell from "./CheckBoxCell";
import ParagraphCell from "./ParagraphCell";
import TimeCell from "./TimeCell";
import TimeRangeCell from "./TimeRangeCell";

type Props = { index: number };

const TableBlock = (props: Props) => {
  const { getBlock, setCurrentCell, setCurrentCellIndex } = useEditor();
  const block = getBlock(props.index);

  const SetColumn = () => {
    const columns = block?.data?.columns;
    if (columns && isArray(columns)) {
      const columnsSum = columns.reduce((a: number, b: number) => a + b, 0);
      let result = [];
      for (let i = 0; i < columns.length; i++) {
        result.push(
          <col width={`${(100 / columnsSum) * columns[i]}%`} key={i} />
        );
      }
      return <colgroup>{result}</colgroup>;
    }
    return <colgroup></colgroup>;
  };
  const Cell = ({
    type,
    col,
    row,
  }: {
    type: string;
    col: number;
    row: number;
  }) => {
    const result = () => {
      switch (type) {
        case "paragraph":
          return (
            <ParagraphCell column={col} row={row} blockIndex={props.index} />
          );
        case "time":
          return <TimeCell column={col} row={row} blockIndex={props.index} />;
        case "timeRange":
          return (
            <TimeRangeCell column={col} row={row} blockIndex={props.index} />
          );
        case "checkbox":
          return (
            <CheckBoxCell column={col} row={row} blockIndex={props.index} />
          );
        default:
          return (
            <ParagraphCell column={col} row={row} blockIndex={props.index} />
          );
      }
    };
    return <div>{result()}</div>;
  };

  return (
    <div className={style.block}>
      <table className={style.table}>
        <SetColumn />
        <tbody>
          {block.data.table !== undefined &&
            block.data?.table.map((value: any, index: number) => {
              return (
                <tr key={index}>
                  {value.map((val: any, ind: number) => {
                    return val.isHeader ? (
                      <th
                        key={ind}
                        id={val.id}
                        onClick={() => {
                          setCurrentCell(val.id);
                          setCurrentCellIndex(index, ind);
                        }}
                        onSelect={() => {
                          setCurrentCell(val.id);
                          setCurrentCellIndex(index, ind);
                        }}
                        colSpan={val?.colSpan}
                        rowSpan={val?.rowSpan}
                      >
                        <Cell type={val.type} row={index} col={ind} />
                      </th>
                    ) : (
                      <td
                        key={ind}
                        id={val.id}
                        onClick={() => {
                          setCurrentCell(val.id);
                          setCurrentCellIndex(index, ind);
                        }}
                        onSelect={() => {
                          setCurrentCell(val.id);
                          setCurrentCellIndex(index, ind);
                        }}
                        colSpan={val?.colSpan}
                        rowSpan={val?.rowSpan}
                      >
                        <Cell type={val.type} row={index} col={ind} />
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
