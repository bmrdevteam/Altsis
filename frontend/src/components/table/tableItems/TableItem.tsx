import _, { isArray } from "lodash";
import React, { useState } from "react";
import { useEffect } from "react";
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
  | "input";

interface ITableItem {
  type: "object-array" | "string-array";
  header: {
    text: string;
    key: string | number;
    value?: string;
    returnFunction?: (value: any) => string;
    onClick?: (value: any) => void;
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
  checked?: boolean;
  append: (item: any) => void;
  delete: (item: any) => void;
}

const TableItem = (props: ITableItem) => {
  const [checked, setChecked] = useState<boolean>(
    props.checked !== undefined ? props.checked : false
  );
  useEffect(() => {
    props.checked && console.log(props.checked);
  }, [props.checked]);

  let output;
  if (props.type === "object-array") {
    const d = _.get(props?.data, props.header.key);
    output = d;

    if (props.header.returnFunction) {
      output = props.header.returnFunction(d);
    } else {
      if (typeof d === "object") {
        output = JSON.stringify(d);
        if (isArray(d) && d.length === 1) {
          output = _.values(d[0]).join(",");
        }
        if (isArray(d) && d.length > 1) {
          output = d.join(",");
        }
      }
    }
  }
  if (props.type === "string-array") {
    const d = props?.data[props.header.key];
    output = d;
    if (props.header.returnFunction) {
      output = props.header.returnFunction(d);
    } else {
      if (typeof d === "object") {
        output = JSON.stringify(d);
        if (isArray(d) && d.length === 1) {
          output = _.values(d[0]).join(",");
        }
        if (isArray(d) && d.length > 1) {
          output = d.join(",");
        }
      }
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
            setChecked((prev) => {
              //if prev was true
              if (prev) {
                props.delete(props.data);
                //was false
              } else {
                props.append(props.data);
              }
              return !prev;
            });
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
          onClick={() => {
            props.header.onClick && props.header.onClick(props.data);
          }}
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
