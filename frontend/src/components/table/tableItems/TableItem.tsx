import useOutsideClick from "hooks/useOutsideClick";
import _, { isArray } from "lodash";
import E from "pages/dev/E";
import React, { useRef, useState } from "react";
import { useEffect } from "react";
import Svg from "../../../assets/svg/Svg";
import { TTableHeaderItem, TTableItemType } from "../Table";
import style from "../table.module.scss";

interface ITableItem {
  type: "object-array" | "string-array";
  header: TTableHeaderItem;
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
  const outsideClick = useOutsideClick();
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
    if (typeof props?.data !== "object") {
      output = props?.data;
    }
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
            whiteSpace: props.header.whiteSpace,
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
            whiteSpace: props.header.whiteSpace,
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
      return outsideClick.active ? (
        <textarea
          ref={outsideClick.RefObject}
          className={`${style.table_item} ${style.input}`}
          defaultValue={output}
          autoFocus
          rows={1}
          onInput={(e) => {
            e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
          }}
          onFocus={(e) => {
            e.target.style.height = e.target.scrollHeight + "px";
          }}
        />
      ) : (
        <div
          className={`${style.table_item}`}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
            whiteSpace: props.header.whiteSpace,
          }}
          ref={outsideClick.RefObject}
          onDoubleClick={() => {
            outsideClick.handleOnClick();
          }}
        >
          {output}
        </div>
      );
    case "input-number":
      return outsideClick.active ? (
        <input
          type={"number"}
          ref={outsideClick.RefObject}
          className={`${style.table_item} ${style.input_number}`}
          defaultValue={output}
          autoFocus
        />
      ) : (
        <div
          className={`${style.table_item}`}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
            whiteSpace: props.header.whiteSpace,
          }}
          ref={outsideClick.RefObject}
          onDoubleClick={() => {
            outsideClick.handleOnClick();
          }}
        >
          {output}
        </div>
      );
    case "select":
      return outsideClick.active ? (
        <select
          ref={outsideClick.RefObject}
          className={`${style.table_item} ${style.select}`}
          defaultValue={output}
          autoFocus
        >
          {props.header.selectOptions?.map((val) => {
            return <option value={val}>{val}</option>;
          })}
        </select>
      ) : (
        <div
          className={`${style.table_item}`}
          style={{
            justifyContent: props.header.align,
            maxWidth: props.header.width,
            border: props.style?.border,
            whiteSpace: props.header.whiteSpace,
          }}
          ref={outsideClick.RefObject}
          onClick={() => {
            outsideClick.handleOnClick();
          }}
        >
          {output}
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
            whiteSpace: props.header.whiteSpace,
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
            whiteSpace: props.header.whiteSpace,
          }}
        >
          {output}
        </div>
      );
  }
};

export { TableItem };
