import React from "react";
import style from "./table.module.scss";
import TableHeaderItem from "./TableHeaderItem";

type Props = { data: string[]; itemTypes: string[] };

const TableHeader = (props: Props) => {
  return (
    <div className={style.table_header}>
      {props.data?.map((value: any, index: number) => {
        return (
          <TableHeaderItem
            key={index}
            data={value}
            itemType={props?.itemTypes[index] ?? ""}
          />
        );
      })}
    </div>
  );
};

export default TableHeader;
