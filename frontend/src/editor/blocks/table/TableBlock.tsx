import { isArray } from "lodash";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import CheckBoxCell from "./CheckBoxCell";
import DataCell from "./DataCell";
import InputCell from "./InputCell";
import ParagraphCell from "./ParagraphCell";
import SelectCell from "./SelectCell";
import TimeCell from "./TimeCell";
import TimeRangeCell from "./TimeRangeCell";

type Props = { index: number };

const TableBlock = (props: Props) => {
  const { getBlock, setCurrentCell, setCurrentCellIndex } = useEditor();
  const block = getBlock(props.index);

  const SetColumn = () => {
    const columns = block?.data?.columns;
    if (columns && Array.isArray(columns)) {
      // 숫자로 변환 후 합산
      const columnsSum = columns.reduce((a: number, b: any) => a + Number(b), 0);
      let result = [];
      for (let i = 0; i < columns.length; i++) {
        result.push(
          <col width={`${(100 / columnsSum) * Number(columns[i])}%`} key={i} />
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
        case "data":
          return <DataCell column={col} row={row} blockIndex={props.index} />;
        case "time":
          return <TimeCell column={col} row={row} blockIndex={props.index} />;
        case "timeRange":
          return (
            <TimeRangeCell column={col} row={row} blockIndex={props.index} />
          );
        case "input":
          return <InputCell column={col} row={row} blockIndex={props.index} />;
        case "select":
          return <SelectCell column={col} row={row} blockIndex={props.index} />;
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

  let spanTrack: {
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
  }[] = [];

  return (
    <div
      className={style.block}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          e.preventDefault();
        }
      }}
    >
      <table
        className={style.table}
        style={{
          fontSize: block.data.fontSize,
          fontWeight: block.data.fontWeight,
          borderWidth: block.data.borderWidth,
          borderColor: block.data.borderColor,
          borderStyle: block.data.borderStyle,
          borderRadius: block.data.borderRadius,
          backgroundColor: block.data.backgroundColor,
        }}
      >
        <SetColumn />
        <tbody>
          {block.data.table !== undefined &&
        block.data?.table.map((value: any, index: number) => {
          return (
        <tr key={index}>
          {value.map((val: any, ind: number) => {
        const spanTrackCurr = spanTrack.filter((v) => {
          if (
        v.rowStart <= index &&
        v.rowEnd > index &&
        v.colStart <= ind &&
        v.colEnd > ind
          ) {
        return true;
          }

          return false;
        });

        if (spanTrackCurr.length > 0) {
          return;
        }

        spanTrack.push({
          rowStart: index,
          rowEnd:
        index +
        (isNaN(parseInt(val.rowSpan))
          ? 1
          : Math.abs(parseInt(val.rowSpan))),
          colStart: ind,
          colEnd:
        ind +
        (isNaN(parseInt(val.colSpan))
          ? 1
          : Math.abs(parseInt(val.colSpan))),
        });

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
        style={{
          fontSize: val?.fontSize,
          fontWeight: val?.fontWeight,
          borderWidth: val?.borderWidth,
          borderColor: val?.borderColor,
          borderStyle: val?.borderStyle,
          borderRadius: val?.borderRadius,
          backgroundColor: val?.backgroundColor,
        }}
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
        style={{
          fontSize: val?.fontSize,
          fontWeight: val?.fontWeight,
          borderWidth: val?.borderWidth,
          borderColor: val?.borderColor,
          borderStyle: val?.borderStyle,
          borderRadius: val?.borderRadius,
          backgroundColor: val?.backgroundColor,
        }}
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
