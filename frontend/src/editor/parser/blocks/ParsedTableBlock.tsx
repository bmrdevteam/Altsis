import { isArray } from "lodash";
import React from "react";
import style from "../../editor.module.scss";

type Props = { blockData: any };
const ParsedTableBlock = (props: Props) => {
  const SetColumn = () => {
    const columns = props.blockData?.data?.columns;
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

  const Cell = ({ data }: { data: any }) => {
    switch (data.type) {
      case "paragraph":
        return (
          <div className={style.cell} style={{ textAlign: data.align }}>
            {data.data?.text}
          </div>
        );
      case "timeRange":
        return (
          <div className={style.cell} style={{ textAlign: data.align }}>
            {data.timeRangeStart}
            {" ~ "}
            {data.timeRangeEnd}
          </div>
        );

      default:
        return (
          <div className={style.cell} style={{ textAlign: data.align }}>
            {data.data?.text}
          </div>
        );
    }
  };

  return (
    <div className={style.parsed_block}>
      <table className={style.table}>
        <SetColumn />
        <tbody>
          {props.blockData.data.table.map((value: any[], index: number) => {
            return (
              <tr key={index}>
                {value.map((val, ind: number) => {
                  return val?.isHeader ? (
                    <th key={ind} colSpan={val?.colSpan} rowSpan={val?.rowSpan}>
                      <Cell data={val} />
                    </th>
                  ) : (
                    <td key={ind} colSpan={val?.colSpan} rowSpan={val?.rowSpan}>
                      <Cell data={val} />
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

export default ParsedTableBlock;