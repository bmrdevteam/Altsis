import React, { useState } from "react";
import style from "../table.module.scss";

type T_TableItem = { data: any };

const TableItem = (props: T_TableItem) => {
  return (
    <div
      onDoubleClick={() => {
        console.log("default");
      }}
      className={style.table_item}
    >
      {props.data}
    </div>
  );
};
const TableItem_Index = (props: T_TableItem) => {
  return (
    <div
      onDoubleClick={() => {
        console.log("index");
      }}
      className={`${style.table_item} ${style.table_item_index} `}
    >
      {props.data}
    </div>
  );
};
const TableItem_String = (props: T_TableItem) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  if (isEditing) {
    return (
      <input
        onBlur={() => {
          setIsEditing(false);
        }}
        className={`${style.table_item} ${style.table_item_string} ${style.edit}`}
        defaultValue={props.data}
        autoFocus
      ></input>
    );
  }
  return (
    <div
      onDoubleClick={() => {
        setIsEditing(true);
      }}
      className={`${style.table_item} ${style.table_item_string} `}
    >
      {props.data}
    </div>
  );
};
const TableItem_Number = (props: T_TableItem) => {
  return (
    <div
      onDoubleClick={() => {
        console.log("number");
      }}
      className={style.table_item}
    >
      {props.data}
    </div>
  );
};

const TableItem_Select = (props: T_TableItem) => {
  const selectColors: any = {
    state1: style.red,
    FALSE: style.red,
    state2: style.green,
    TRUE: style.green,
    state3: style.blue,
    state4: style.dark_blue,
  };
  return (
    <div
      onDoubleClick={() => {
        console.log(props.data);
      }}
      className={`${style.table_item} ${style.table_item_select}`}
    >
      <span className={selectColors[props.data.trim()]}>{props.data}</span>
    </div>
  );
};

export {
  TableItem,
  TableItem_String,
  TableItem_Index,
  TableItem_Select,
  TableItem_Number,
};
