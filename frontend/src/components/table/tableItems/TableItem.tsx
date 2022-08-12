import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Svg from "../../../assets/svg/Svg";
import style from "../table.module.scss";

interface ITableItem {
  header: {
    text: string;
    key: string;
    value?: string;
    onClick?: (e:React.MouseEvent<HTMLDivElement>) => void;
    type:
      | "index"
      | "string"
      | "button"
      | "dateTime"
      | "date"
      | "time"
      | "select"
      | "checkbox"
      | "link"
      | "input";
    link?: string;
    align?: "left" | "center" | "right";
    width?: string;
  };
  index: number;
  data: any;
  style?: {
    border?: string;
    backgroundColor?: string;
  };
}

const TableItem = (props: ITableItem) => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<boolean>(false);

  switch (props.header.type) {
    case "index":
      return (
        <div
          className={style.table_item}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
        >
          {props.index + 1}
        </div>
      );
    case "checkbox":
      return (
        <div
          className={style.table_item}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            padding: "12px",
            border: props.style?.border,
          }}
        >
          <input
            type="checkbox"
            className="checkbox"
            style={{
              width: "24px",
              height: "24px",
              appearance: "none",
              position: "absolute",
              cursor: "pointer",
            }}
            onChange={(e) => {
              if (e.target.checked) {
                setChecked(true);
              } else {
                setChecked(false);
              }
            }}
          />
          {checked ? (
            <Svg
              type={"checkboxChecked"}
              height={"24px"}
              width={"24px"}
              fill={"#0062c7"}
            />
          ) : (
            <Svg type={"checkbox"} height={"24px"} width={"24px"} />
          )}
        </div>
      );
    case "input":
      return (
        <div
          className={style.table_item}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
        >
          []
        </div>
      );
    case "link":
      return (
        <div
          className={style.table_item}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
          onClick={() => {
            navigate(props.header.link + "/" + props.data[props.header.key], {
              replace: true,
            });
          }}
        >
          {props.header.text}
        </div>
      );
    case "button":
      return (
        <div
          className={style.table_item}
          onClick={props.header.onClick}
          data-value={
            props.header.value
              ? props.header.value
              : props.data[props.header.key]
          }
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
        >
          {props.header.text}
        </div>
      );
    default:
      return (
        <div
          className={style.table_item}
          data-value={
            props.header.value
              ? props.header.value
              : props.data[props.header.key]
          }
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
        >
          {props.data[props.header.key]}
        </div>
      );
  }
};
// const TableItem_Index = (props: T_TableItem) => {
//   return (
//     <div
//       onDoubleClick={() => {
//         console.log("index");
//       }}
//       className={`${style.table_item} ${style.table_item_index} `}
//     >
//       {props.data}
//     </div>
//   );
// };
// const TableItem_String = (props: T_TableItem) => {
//   const [isEditing, setIsEditing] = useState<boolean>(false);
//   if (isEditing) {
//     return (
//       <input
//         onBlur={() => {
//           setIsEditing(false);
//         }}
//         className={`${style.table_item} ${style.table_item_string} ${style.edit}`}
//         defaultValue={props.data}
//         autoFocus
//       >
//       </input>
//     );
//   }
//   return (
//     <div
//       onDoubleClick={() => {
//         setIsEditing(true);
//       }}
//       className={`${style.table_item} ${style.table_item_string} `}
//     >
//       {props.data}
//     </div>
//   );
// };
// const TableItem_Number = (props: T_TableItem) => {
//   return (
//     <div
//       onDoubleClick={() => {
//         console.log("number");
//       }}
//       className={style.table_item}
//     >
//       {props.data}
//     </div>
//   );
// };

// const TableItem_Select = (props: T_TableItem) => {
//   const selectColors: any = {
//     pending: style.red,
//     "주문 대기중": style.red,
//     finished: style.green,
//     "주문 완료": style.green,
//     refunding: style.blue,
//     "환불 대기중": style.blue,
//     refunded: style.dark_blue,
//     "환불 완료": style.dark_blue,
//   };
//   return (
//     <div
//       onDoubleClick={() => {
//         console.log("asd");
//       }}
//       className={`${style.table_item} ${style.table_item_select}`}
//     >
//       <span className={selectColors[props.data]}>{props.data}</span>
//     </div>
//   );
// };

export { TableItem };
