import React, {Dispatch, useState, useCallback, MouseEvent, SetStateAction} from "react";
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
import Popover from "@mui/material/Popover";
import Button from "../../../components/button/Button";
import useReload from "../../functions/useReload";

type Props = {
  callPageReload: Dispatch<SetStateAction<number>>,
  index: number
};

const TableBlock = (props: Props) => {
  const { getBlock, setCurrentCell, setCurrentCellIndex, changeBlockData, addToCurrentRow } = useEditor();
  const { callPageReload, _init } = useReload();
  const block = getBlock(props.index);
  const [rowEl, setRowEl] = useState<HTMLTableRowElement | null>(null);
  const toolbarOpen = Boolean(rowEl);

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

  const handleFocus = useCallback((event: React.FocusEvent<HTMLTableRowElement>) => {
    setRowEl(event.currentTarget);
  }, []);

  const handleMouseOver = useCallback((event: MouseEvent<HTMLTableRowElement>) => {
    setRowEl(event.currentTarget);
  }, []);

  const handleMouseOut = useCallback((event: MouseEvent<HTMLTableRowElement>) => {
    setRowEl(null);
  }, []);

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
        style={{ fontSize: block.data.fontSize }}
        onClick={() => {
          // console.log(spanTrack);
        }}
      >
        <SetColumn />
        <tbody>
        {block.data.table !== undefined && block.data?.table.map((blockValue: any, index: number) => {
            return (
                <tr key={index}>
                  {blockValue.map((val: any, ind: number) => {
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
                              style={{ fontSize: val?.fontSize }}
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
                              style={{ fontSize: val?.fontSize }}
                            >
                              <Cell type={val.type} row={index} col={ind} />
                            </td>
                          )})}
                      </tr>
              )})}
            </tbody>
      </table>
      <Popover
        id="toolbar"
        open={toolbarOpen}
        anchorEl={rowEl}
        onClose={handleMouseOut}
        anchorOrigin={{
          vertical: "center",
          horizontal: "left",
        }}>
        <Button
          type="ghost"
          style={{
            flex: "1 1 0",
            marginTop: "8px",
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={() => {
            addToCurrentRow();
            _init(props.callPageReload);
            callPageReload();
          }}
        >
          행 복사
        </Button>
      </Popover>
    </div>
  );
};

export default TableBlock;
