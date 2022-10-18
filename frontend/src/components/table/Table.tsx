/**
 * @version 1.0
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 */

import React from "react";
import Svg from "../../assets/svg/Svg";
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

/**
 * returns a filterItem component for the filter component
 *
 * @returns {JSX.Element}
 *
 * @example <TableFilterItem/>
 *
 * @version 1.0 design + close and open
 */
const TableFilterItem = () => {
  // implement close on clicked somewhere else
  const outsideClick = useOutsideClick();

  // return
  return (
    <div className={style.item}>
      <div onClick={outsideClick.handleOnClick}>
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

/**
 * returns a control component for the table component
 *
 * @returns {JSX.Element} controls component
 *
 * @example
 * <TableControls/>
 *
 * @version 1.0 design + close and open
 *
 */
const TableControls = () => {
  // implement close on clicked somewhere else
  const outsideClick = useOutsideClick();

  // return
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

/**
 * a table component
 *
 * @param {Props}
 *
 * @returns {JSX.Element}
 * 
 * @example 
 <Table
  data={search.result()}
  header={[
    {
      text: "id",
      key: "",
      type: "index",
      width: "48px",
      align: "center",
    },
    { 
      text: "이름",
      key: "userName",
      type: "string",
      align: "right" 
    },
  ]}
/>
 * @version 2.1 added filters and controls to the component
 * @version 1.2 removed the link item due to simplifying the items - use buttons instead
 * @version 1.1 minor fixes on the button item
 * @version 1.0 initial version - created the table component
 */
const Table = (props: Props) => {
  const search = useSearch({});

  /**
   * filter component
   *
   * @returns {JSX.Element}
   *
   * @version 1.0 design
   */

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

  /**
   * table header component
   *
   * @returns {JSX.Element}
   *
   * @version 1.0
   */

  const TableHeader = () => {
    //return
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

  /**
   * table header component
   *
   * @returns {JSX.Element}
   *
   * @version 1.0
   */

  const TableBody = () => {
    return (
      <div
        className={style.table_body}
        style={{ height: props.style?.bodyHeight }}
      >
        <div className={style.table_body_container}>
          {/* map through rows */}
          {props.data?.map((data: any, dataIndex: number) => {
            return (
              <div
                key={dataIndex}
                className={style.table_row}
                style={{ height: props.style?.rowHeight }}
              >
                {/* map through the header to display the right output with the data */}
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

  //return the table component
  return (
    <div
      className={style.table_container}
      style={{
        border: props.style?.border,
      }}
    >
      {props.filter && <TableFilter />}
      <TableHeader />
      <TableBody />
    </div>
  );
};

export default Table;
