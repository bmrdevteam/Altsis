/**
 * @version 1.0
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 */

import React, { useState } from "react";

import useOutsideClick from "hooks/useOutsideClick";
import Button from "../button/Button";
import style from "./table.module.scss";
import { ITableItemType, TableItem } from "./tableItems/TableItem";
import Svg from "assets/svg/Svg";
import { useEffect } from "react";
import useSearch from "hooks/useSearch";
import { useRef } from "react";
import Select from "components/select/Select";
import objectDownloadAsJson from "functions/objectDownloadAsJson";
import objectDownloadAsCSV from "functions/objectDownloadAsCSV";

type Props = {
  data: any;
  header: {
    text: string;
    key: string | string[];
    value?: string;
    returnFunction?: (value: any) => string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    type: ITableItemType;
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
  onSelectChange?: (value: any) => void;
  filter?: boolean;
  filterSearch?: boolean;
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
              style={{
                fontSize: "14px",
                padding: "0 18px",
                borderRadius: "4px",
              }}
            >
              삭제
            </Button>
            <Button
              type="hover"
              style={{
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
const TableControls = (props: { selectedItems: any[]; data: any }) => {
  // const search = useSearch()
  // implement close on clicked somewhere else
  const outsideClickForFilter = useOutsideClick();
  const outsideClickForExport = useOutsideClick();

  // return
  return (
    <div className={style.controls}>
      <div ref={outsideClickForFilter.RefObject}>
        <div
          className={style.icon}
          onClick={() => outsideClickForFilter.setActive((prev) => !prev)}
        >
          <Svg type="filter" />
        </div>
        {outsideClickForFilter.active && (
          <div className={style.filters}>
            <div>필터</div>
            <div className={style.item}>
              <div className={style.content}>
                <span style={{ flex: "1 1 0" }}>item1</span>
                <Select options={[{ text: "<", value: "" }]} />
                <span style={{ flex: "1 1 0", textAlign: "center" }}>12</span>
              </div>
              <Svg type="x" />
            </div>

            <div className={style.item}>
              <div className={style.content}>
                <span style={{ flex: "1 1 0" }}>item1</span>
                <Select options={[{ text: "<", value: "" }]} />
                <span style={{ flex: "1 1 0", textAlign: "center" }}>12</span>
              </div>
              <Svg type="x" />
            </div>
            <div className={style.cons}>
              <div>
                <Button type="hover" style={{ borderRadius: "4px" }}>
                  지우기
                </Button>
              </div>
              <div>
                <Button type="hover" style={{ borderRadius: "4px" }}>
                  추가
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={outsideClickForExport.RefObject}>
        <div
          className={style.icon}
          onClick={() => outsideClickForExport.setActive((prev) => !prev)}
        >
          <Svg type="horizontalDots" />
        </div>
        {outsideClickForExport.active && (
          <div className={style.control}>
            <div
              className={style.item}
              onClick={() => {
                objectDownloadAsCSV(props.data);
              }}
            >
              csv 다운로드
            </div>
            <div
              className={style.item}
              onClick={() => {
                objectDownloadAsJson(props.data);
              }}
            >
              json 다운로드
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * table search component
 *
 * @returns {JSX.Element}
 *
 * @version 1.0
 */
const TableSearch = ({
  searchKeyName,
  searchKey,
  search,
}: {
  searchKeyName: any;
  searchKey: any;
  search: any;
}) => {
  const [searchValue, setSearchValue] = useState<string>(
    search.filters.filter((f: any) => {
      return f.id === "mainSearch";
    })[0]?.value ?? ""
  );
  return (
    <div className={style.search}>
      <input
        className={style.input}
        type="text"
        value={searchValue}
        placeholder={`${searchKeyName} 검색`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            search.addFilterItem({
              id: "mainSearch",
              value: searchValue,
              key: searchKey,
              operator: "=",
            });
          }
        }}
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
      />
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
  const [searchKey, setSearchKey] = useState<string>("");
  const [searchKeyName, setSearchKeyName] = useState<string>("");
  const selectedItems = useRef<any>([]);

  const [tableData, setTableData] = useState<any>(props.data);
  const search = useSearch(tableData);

  useEffect(() => {
    setTableData(props.data);
  }, [props.data]);

  function appendItemToSelect(item: any) {
    if (!selectedItems.current?.includes(item)) {
      selectedItems.current.push(item);
      props.onSelectChange && props.onSelectChange(selectedItems.current);
    }
  }
  function deleteItemFromSelect(item: any) {
    selectedItems.current = selectedItems.current.filter(
      (val: any) => val !== item
    );
    props.onSelectChange && props.onSelectChange(selectedItems.current);
  }

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
        {props.filterSearch && (
          <TableSearch
            searchKey={searchKey}
            search={search}
            searchKeyName={searchKeyName}
          />
        )}
        <TableControls data={tableData} selectedItems={selectedItems.current} />
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
          return value.type !== "checkbox" ? (
            <div
              className={style.table_header_item}
              key={index}
              style={{
                justifyContent: value.align,
                maxWidth: value.width,
                border: props.style?.border,
              }}
              onClick={() => {
                setSearchKey(value.key);
                setSearchKeyName(value.text);
              }}
            >
              {value.text}
            </div>
          ) : (
            <div
              className={style.table_header_item}
              key={index}
              style={{
                justifyContent: value.align,
                maxWidth: value.width,
                border: props.style?.border,
                padding: "12px",
              }}
            >
              {false ? (
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
        style={{
          height: props.filter ? "calc(100% - 96px)" : "calc(100% - 48px)",
        }}
      >
        <div className={style.table_body_container}>
          {/* map through rows */}
          {tableData &&
            search?.result()?.map((data: any, dataIndex: number) => {
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
                        append={appendItemToSelect}
                        delete={deleteItemFromSelect}
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
