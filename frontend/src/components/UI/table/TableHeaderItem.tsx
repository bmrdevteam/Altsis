import React from "react";
import style from "./table.module.scss";

type Props = { data: string; itemType: string };

const TableHeaderItem = (props: Props) => {
  switch (props?.itemType) {
    case "index":
      return (
        <div className={`${style.table_header_item} ${style.table_item_index}`}>
          {props?.data}
        </div>
      );
    case "string":
      return (
        <div className={`${style.table_header_item} ${style.table_item_string}`}>
          {props?.data}
        </div>
      );
    default:
      return <div className={style.table_header_item}>{props?.data}</div>;
  }
};

export default TableHeaderItem;
