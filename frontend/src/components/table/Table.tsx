import React from "react";
import style from "./table.module.scss";
import { TableItem } from "./tableItems/TableItem";

type Props = {
  data: any;
  header: {
    text: string;
    key: string;
    value?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    type:
      | "index"
      | "string"
      | "button"
      | "dateTime"
      | "date"
      | "time"
      | "select"
      | "checkbox"
      | "arrText"
      | "link"
      | "input";
    link?: string;
    align?: "left" | "center" | "right";
    width?: string;
    textStyle?: object;
  }[];
  style?: {
    border?: string;
    backgroundColor?: string;
    rowHeight?: string;
    bodyHeight?: string;
  };
};

const Table = (props: Props) => {
  const TableHeader = () => {
    return (
      <div className={style.table_header}>
        {props.header.map((value: any, index: number) => {
          return (
            <div
              className={style.table_header_item}
              key={index}
              style={{
                justifyContent: value.align,
                maxWidth: value.width,
                border: props.style?.border,
                backgroundColor: props.style?.backgroundColor,
              }}
            >
              {value.text}
            </div>
          );
        })}
      </div>
    );
  };

  const TableBody = () => {
    return (
      <div
        className={style.table_body}
        style={{ height: props.style?.bodyHeight }}
      >
        <div className={style.table_body_container}>
          {props.data?.map((data: any, dataIndex: number) => {
            return (
              <div
                key={dataIndex}
                className={style.table_row}
                style={{ height: props.style?.rowHeight }}
              >
                {props.header.map((value, index) => {
                  return (
                    <TableItem
                      key={index}
                      header={value}
                      data={data}
                      index={dataIndex}
                      style={props.style}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={style.table_container}
      style={{
        border: props.style?.border,
        backgroundColor: props.style?.backgroundColor,
      }}
    >
      <TableHeader />
      <TableBody />
    </div>
  );
};

export default Table;
