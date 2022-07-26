import React, { useState } from "react";
import { editorData } from "../../../../dummyData/editorData";
import style from "./editorTable.module.scss";
import TableCell from "./TableCell";

type Props = {};

const Table = (props: Props) => {
  const [tableData, setTableData] = useState(editorData.data[1]);
  console.log(tableData);

  return (
    <div className={style.table_container} style={{ gridTemplateColumns: "" }}>
      <div className={style.grid}>
        {tableData.data?.map((value, index) => {
          return (
            <TableCell
              key={index}
              col={value.col}
              row={value.row}
              colSpan={value.colspan}
              rowSpan={value.rowspan}
            >
              {value.content}
            </TableCell>
          );
        })}
      </div>
    </div>
  );
};

export default Table;
