import React, { RefObject, useState } from "react";
import Svg from "../../assets/svg/Svg";
import useDatabase from "../../hooks/useDatabase";
import useOutsideClick from "../../hooks/useOutsideClick";
import useSearch from "../../hooks/useSearch";
import Button from "../button/Button";
import style from "./table.module.scss";
import { TableItem } from "./tableItems/TableItem";

type Props = {
  data: any;
  header: {
    text: string;
    key: string | string[];
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
    rowHeight?: string;
    bodyHeight?: string;
  };
  filter?: boolean;
};

const TableFilterItem = () => {
  const outsideClick = useOutsideClick();
  return (
    <div className={style.item}>
      <div
        onClick={() => {
          outsideClick.setActive(true);
        }}
      >
        <span className={style.emphasis}>학교명</span>
        <span>&gt;</span>
        <span className={`${style.emphasis} ${style.number}`}>100</span>
      </div>
      <span className={style.cancel}>
        <Svg type={"x"} />
      </span>{" "}
      {outsideClick.active && (
        <div className={style.filter_editor} ref={outsideClick.RefObject}>
          <div>
            <span className={style.edit_emphasis}>학교명</span>
            <span>&gt;</span>
            <span className={`${style.edit_emphasis} ${style.number}`}>
              100
            </span>
          </div>
          <div style={{ display: "flex", margin: "24px 0 0 auto" }}>
            <Button
              type="hover"
              styles={{
                fontSize: "14px",
                padding: "0 18px",
                borderRadius: "4px",
              }}
            >
              삭제
            </Button>
            <Button
              type="hover"
              styles={{
                fontSize: "14px",
                padding: "0 18px",
                borderRadius: "4px",
              }}
            >
              적용
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
const TableControls = () => {
  const outsideClick = useOutsideClick();
  const database = useDatabase()

  return (
    <div className={style.controls}>
      <div className={style.icon} onClick={outsideClick.handleOnClick}>
        <Svg type="horizontalDots" />
      </div>
      {outsideClick.active && (
        <div className={style.control} ref={outsideClick.RefObject}>
          <div className={style.item}>csv 다운로드</div>
          <div className={style.item}>json 다운로드</div>
        </div>
      )}
    </div>
  );
};
const Table = (props: Props) => {
  const search = useSearch({});

  const TableFilter = () => {
    return (
      <div className={style.table_filter}>
        <div className={style.filters}>
          <TableFilterItem />
        </div>
        <TableControls />
      </div>
    );
  };
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
      }}
    >
      <TableFilter />
      <TableHeader />
      <TableBody />
    </div>
  );
};

export default Table;
