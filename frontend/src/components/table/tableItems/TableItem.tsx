import _, { isArray } from "lodash";
import React, { useState } from "react";
import Svg from "../../../assets/svg/Svg";
import style from "../table.module.scss";

export type ITableItemType =
  | "index"
  | "string"
  | "button"
  | "dateTime"
  | "date"
  | "time"
  | "select"
  | "checkbox"
  | "arrText"
  | "input";

interface ITableItem {
  header: {
    text: string;
    key: string | string[];
    value?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    type: ITableItemType;
    link?: string;
    align?: "left" | "center" | "right";
    width?: string;
    textStyle?: object;
  };
  index: number;
  data: any;
  style?: {
    border?: string;
    backgroundColor?: string;
  };
  append: (item: any) => void;
  delete: (item: any) => void;
}

const TableItem = (props: ITableItem) => {
  const [checked, setChecked] = useState<boolean>(false);
  // const [output, setOutput] = useState("");
  let output = "";
  const d = _.get(props?.data, props.header.key);
  if (typeof d === "string") {
    output = d;
  }
  if (typeof d === "object") {
    output = JSON.stringify(d);
    if (isArray(d) && d.length === 1) {
      output = _.values(d[0]).join(",");
    }
    if (isArray(d) && d.length > 1) {
      output = d.join(",");
    }
  }

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
          onClick={() => {
            setChecked((prev) => !prev);
          }}
        >
          {checked ? (
            <Svg
              type={"checkboxChecked"}
              height={"24px"}
              width={"24px"}
              style={{ fill: "#0062c7" }}
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
    case "button":
      return (
        <div
          className={style.table_item}
          onClick={props.header.onClick}
          data-value={props.header.value ? props.header.value : output}
          data-rowindex={props.index}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
        >
          <div
            data-value={props.header.value ? props.header.value : output}
            data-rowindex={props.index}
            style={props.header.textStyle}
          >
            {props.header.text}
          </div>
        </div>
      );

    case "arrText":
      return (
        <div
          className={style.table_item}
          onClick={props.header.onClick}
          data-value={props.header.value ? props.header.value : props.data}
          data-rowindex={props.index}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
        >
          {props.data ? props.data : null}
        </div>
      );

    default:
      return (
        <div
          className={style.table_item}
          data-value={props.header.value ? props.header.value : output}
          data-rowindex={props.index}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
          }}
        >
          {output}
        </div>
      );
  }
};

export { TableItem };
