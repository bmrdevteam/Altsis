import React from "react";
import style from "./table.module.scss";
import {
  TableItem,
  TableItem_Index,
  TableItem_Select,
  TableItem_Number,
  TableItem_String,
} from "./tableItems/TableItem";

type Props = {
  index: number;
  data: any;
  items: string[];
  itemTypes: string[];
};

const TableRow = (props: Props) => {
  return (
    <div className={style.table_row}>
      {props.items.map((value: any, index: number) => {
        switch (props?.itemTypes[index]) {
          case "index":
            return (
              <TableItem_Index
                key={index}
                data={props?.data[value] ?? "null"}
              />
            );
          case "string":
            return (
              <TableItem_String
                key={index}
                data={props?.data[value] ?? "null"}
              />
            );
          case "select":
            return (
              <TableItem_Select
                key={index}
                data={props?.data[value] ?? "null"}
              />
            );
          case "number":
            return (
              <TableItem_Number
                key={index}
                data={props?.data[value] ?? "null"}
              />
            );
          default:
            return (
              <TableItem key={index} data={props?.data[value] ?? "null"} />
            );
        }
      })}
    </div>
  );
};

export default TableRow;
