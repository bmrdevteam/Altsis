import React from "react";
import TableRow from "./TableRow";
import style from "./table.module.scss";

type Props = { data: any; items: string[] ;itemTypes:string[];};

const TableBody = (props: Props) => {
  return (
    <div className={style.table_body}>
      <div className={style.table_body_container}>
        {props.data?.map((value: any, index: number) => {
          return (
            <TableRow
              key={index}
              index={index}
              data={value}
              items={props?.items}
              itemTypes={props?.itemTypes}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TableBody;
