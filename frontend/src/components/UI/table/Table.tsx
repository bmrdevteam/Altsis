import React, { useState } from "react";
import style from "./table.module.scss";
import TableBody from "./TableBody";
import TableHeader from "./TableHeader";

type Props = {
  data: any;
  header: string[];
  items: string[];
  itemTypes: string[];
};

const Table = (props: Props) => {
  const [sortBy, setSortBy] = useState(null);
  const [items, setItems] = useState(props.items);

  return (
    <div className={style.table_container}>
      <TableHeader data={props.header} itemTypes={props.itemTypes} />
      <TableBody data={props.data} items={items} itemTypes={props.itemTypes} />
    </div>
  );
};

export default Table;
