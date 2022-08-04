import React, { useState } from "react";
import style from "./table.module.scss";

import TableRow from "./TableRow";

type Props = {
  data: any;
  header: {
    text: string;
    key: string;
    type: string;
  }[];
};

const Table = (props: Props) => {
  const [sortBy, setSortBy] = useState(null);

  const TableHeaderItem = ({ type, text }: { type: string; text: string }) => {
    switch (type) {
      case "index":
        return (
          <div
            className={`${style.table_header_item} ${style.table_item_index}`}
          >
            {text}
          </div>
        );
      case "string":
        return (
          <div
            className={`${style.table_header_item} ${style.table_item_string}`}
          >
            {text}
          </div>
        );
      default:
        return <div className={style.table_header_item}>{text}</div>;
    }
  };

  const TableHeader = () => {
    return (
      <div className={style.table_header}>
        {props.header.map((value: any, index: number) => {
          return (
            <TableHeaderItem
              key={index}
              text={props.header[index].text}
              type={props.header[index].type ?? ""}
            />
          );
        })}
      </div>
    );
  };
  const TableBody = () => {
    return (
      <div className={style.table_body}>
        <div className={style.table_body_container}>
         

        </div>
      </div>
    );
  };

  return (
    <div className={style.table_container}>
      <TableHeader/>
      <TableBody />
    </div>
  );
};

export default Table;
