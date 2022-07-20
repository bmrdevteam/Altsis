import React from "react";
import style from "../table.module.scss";

type Props = { data: any };

function TableItem_selectOrderState(props: Props) {
  const selectColors: any = {
    pending: style.red,
    "state1": style.red,
    finished: style.green,
    "TRUE": style.green,
    refunding: style.blue,
    "환불 대기중": style.blue,
    refunded: style.dark_blue,
    "환불 완료": style.dark_blue,
  };
  return (
    <div
      onDoubleClick={() => {
        console.log(props.data);
      }}
      className={`${style.table_item} ${style.table_item_select}`}
    >
      <span className={selectColors[props.data]}>{props.data}</span>
    </div>
  );
}

export default TableItem_selectOrderState;
