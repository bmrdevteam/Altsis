import React, { useEffect, useState } from "react";
import style from "./table.module.scss";
import _, { isArray, isBoolean, isNumber } from "lodash";
import Svg from "assets/svg/Svg";
import { flattenObject } from "functions/functions";
import useOutsideClick from "hooks/useOutsideClick";

type TTableItems = "text" | "checkbox" | "button" | "status";
type TTableHeader = {
  text: string;
  type: TTableItems;
  key?: string;
  width?: string;
  textAlign?: "left" | "center" | "right";
  status?: {
    [key: string]: { text?: string; color?: string; background?: string };
  };
  onClick?: (value: any) => void;
};
type Props = {
  type: "object-array" | "string-array";
  data: any[] | string[];
  header: TTableHeader[];
  control?: boolean;
  defaultPageBy?: 0 | 10 | 50 | 100 | 200;
};

const Table = (props: Props) => {
  const [tableSettings, setTableSettings] = useState<{
    pageBy: number;
    pageIndex: number;
  }>({
    pageBy: props.defaultPageBy ?? 0,
    pageIndex: 1,
  });

  const [tableData, setTableData] = useState<{
    data: any[];
    orderBy: string;
    order: "desc" | "asc";
    searchParam: string;
    searchParamName: string;
  }>({
    data: [],
    orderBy: "",
    order: "desc",
    searchParam: "",
    searchParamName: "",
  });
  const moreOutSideClick = useOutsideClick();
  function filteredData(): any[] {
    let result = [];
    if (!tableData.orderBy) {
      result = tableData.data.filter((val) => {
        const text = Object.values(val).join("");
        return text.includes(tableData.searchParam);
      });
    } else {
      result = tableData.data.filter((val) => {
        const param = val[tableData.orderBy];
        if (isBoolean(param)) {
          return `${param}`.includes(tableData.searchParam);
        }
        if (param) {
          if (isNumber(param)) {
            return (
              tableData.searchParam === "" ||
              param === parseInt(tableData.searchParam)
            );
          }

          return `${param}`.includes(tableData.searchParam);
        }
        return false;
      });
      result = _.sortBy(result, tableData.orderBy);
    }
    if (tableData.order === "asc") result.reverse();

    if (tableSettings.pageBy === 0) {
      return result;
    }

    const pageStart = tableSettings.pageBy * (tableSettings.pageIndex - 1);
    const pageEnd = tableSettings.pageBy * tableSettings.pageIndex;
    return result.slice(pageStart, pageEnd);
  }

  useEffect(() => {
    if (props.type === "object-array") {
      setTableData((prev) => ({
        ...prev,
        data:
          [
            ...props.data.map((val, index) => {
              return {
                ...flattenObject(val),
                // tableRowId: generateRandomId(8),
                tableRowIndex: index + 1,
              };
            }),
          ] ?? [],
      }));
    } else {
      setTableData((prev) => ({
        ...prev,
        data:
          [
            ...props.data.map((val, index) => {
              return {
                ...[val],
                tableRowIndex: index + 1,
              };
            }),
          ] ?? [],
      }));
    }
  }, [props.data]);
  useEffect(() => {
    console.log(tableData.data);
  }, [tableData.data]);

  function handleHeaderOnClick(val: TTableHeader) {
    if (val.key !== undefined && val.key !== " ") {
      if (tableData.orderBy !== val.key) {
        setTableData((prev) => ({
          ...prev,
          orderBy: `${val.key}`,
          searchParamName: `${val.text}`,
        }));
      } else {
        if (tableData.order === "desc") {
          setTableData((prev) => ({
            ...prev,
            order: "asc",
          }));
        } else {
          setTableData((prev) => ({
            ...prev,
            order: "desc",
            orderBy: "",
            searchParamName: "",
          }));
        }
      }
    }
  }
  return (
    <table className={style.table}>
      <colgroup>
        {props.header.map((val, index) => {
          return <col width={val.width} key={index} />;
        })}
      </colgroup>
      <thead className={style.header}>
        {props.control && (
          <>
            <tr>
              <td colSpan={props.header.length}>
                <div className={style.control}>
                  <input
                    className={style.search}
                    type="text"
                    placeholder={`${tableData.searchParamName} 검색`}
                    value={tableData.searchParam}
                    onChange={(e) => {
                      setTableData((prev) => ({
                        ...prev,
                        searchParam: e.target.value,
                      }));
                    }}
                  />
                  <div className={style.pager}>
                    <span
                      className={style.arrow}
                      onClick={() => {
                        tableSettings.pageBy !== 0 &&
                          tableSettings.pageIndex > 1 &&
                          setTableSettings((prev) => ({
                            ...prev,
                            pageIndex: prev.pageIndex - 1,
                          }));
                      }}
                    >
                      <Svg type={"chevronLeft"} width="20px" height="20px" />
                    </span>
                    <input
                      value={tableSettings.pageIndex}
                      className={style.number}
                      onChange={(e) => {
                        const number = isNaN(parseInt(e.target.value))
                          ? 1
                          : parseInt(e.target.value);
                        if (
                          number > 0 &&
                          tableSettings.pageBy !== 0 &&
                          number < tableData.data.length / tableSettings.pageBy
                        ) {
                          setTableSettings((prev) => ({
                            ...prev,
                            pageIndex: number,
                          }));
                        }
                        if (
                          tableSettings.pageBy !== 0 &&
                          number > tableData.data.length / tableSettings.pageBy
                        ) {
                          setTableSettings((prev) => ({
                            ...prev,
                            pageIndex: tableData.data.length,
                          }));
                        }
                      }}
                    />
                    <span
                      className={style.arrow}
                      onClick={() => {
                        tableSettings.pageBy !== 0 &&
                          tableSettings.pageIndex <
                            tableData.data.length / tableSettings.pageBy &&
                          setTableSettings((prev) => ({
                            ...prev,
                            pageIndex: prev.pageIndex + 1,
                          }));
                      }}
                    >
                      <Svg type={"chevronRight"} width="20px" height="20px" />
                    </span>
                    <select
                      value={tableSettings.pageBy}
                      className={style.page_by}
                      onChange={(e) => {
                        setTableSettings((prev) => ({
                          ...prev,
                          pageIndex: 1,
                          pageBy: parseInt(e.target.value),
                        }));
                      }}
                    >
                      <option value="0">전체 보기</option>
                      <option value="10">10개씩 보기</option>
                      <option value="50">50개씩 보기</option>
                      <option value="100">100개씩 보기</option>
                      <option value="200">200개씩 보기</option>
                    </select>
                  </div>
                  <div
                    className={style.more}
                    ref={moreOutSideClick.RefObject}
                    onClick={moreOutSideClick.handleOnClick}
                  >
                    <Svg type={"horizontalDots"} width="20px" height="20px" />
                    {moreOutSideClick.active && (
                      <div className={style.menu_container}>
                        <div className={style.menu_item}>CSV 으로 다운로드</div>
                        <div className={style.menu_item}>
                          JSON 으로 다운로드
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td
                colSpan={props.header.length}
                style={{
                  padding: 0,
                  background: "var(--border-default-color)",
                  height:"1px"
                }}
              />
            </tr>
          </>
        )}
        <tr>
          {props.header.map((val, index) => {
            switch (val.type) {
              case "checkbox":
                const allChecked =
                  tableData.data.filter((c) => !c.checked).length === 0;
                const allEmpty =
                  tableData.data.filter((c) => c.checked).length === 0;
                const checkTo = (to: boolean) => {
                  let arr: any[] = [];
                  tableData.data.forEach((e) => {
                    arr.push({ ...e, checked: to });
                  });
                  return arr;
                };

                return (
                  <th
                    style={{ textAlign: val.textAlign }}
                    className={style.item_container}
                    key={index}
                    onClick={() => {
                      if (allEmpty) {
                        setTableData((prev) => ({
                          ...prev,
                          data: checkTo(true),
                        }));
                      } else {
                        setTableData((prev) => ({
                          ...prev,
                          data: checkTo(false),
                        }));
                      }
                    }}
                  >
                    <span className={style.icon}>
                      {allChecked ? (
                        <Svg
                          type="checkboxChecked"
                          width="20px"
                          height="20px"
                        />
                      ) : allEmpty ? (
                        <Svg type="checkbox" width="20px" height="20px" />
                      ) : (
                        <Svg type="checkboxMinus" width="20px" height="20px" />
                      )}
                    </span>
                  </th>
                );
              default:
                return (
                  <th
                    style={{ textAlign: val.textAlign }}
                    className={style.item_container}
                    key={index}
                    onClick={() => {
                      handleHeaderOnClick(val);
                    }}
                  >
                    <div className={style.item}>
                      <span className={style.icon}>
                        {tableData.orderBy === val.key &&
                          tableData.order === "asc" && <Svg type="chevronUp" />}
                      </span>
                      <span>{val.text}</span>
                      <span className={style.icon}>
                        {tableData.orderBy === val.key &&
                          tableData.order === "desc" && (
                            <Svg type="chevronDown" />
                          )}
                      </span>
                    </div>
                  </th>
                );
            }
          })}
        </tr>
      </thead>
      <tbody>
        {props.data &&
          isArray(props.data) &&
          filteredData().map((row, rowIndex) => {
            return (
              <tr key={rowIndex}>
                {props.header.map((val, index) => {
                  switch (val.type) {
                    case "checkbox":
                      return (
                        <td
                          style={{ textAlign: val.textAlign }}
                          className={`${style.item} ${style.checkbox}`}
                          key={index}
                          onClick={() => {
                            const arr = [...tableData.data];
                            const ii = arr.findIndex(
                              (r) => r.tableRowIndex === row.tableRowIndex
                            );
                            arr[ii].checked = !arr[ii].checked;
                            setTableData((prev) => ({
                              ...prev,
                              data: arr,
                            }));
                          }}
                        >
                          <span className={style.icon}>
                            {!row.checked ? (
                              <Svg type="checkbox" width="20px" height="20px" />
                            ) : (
                              <Svg
                                type="checkboxChecked"
                                width="20px"
                                height="20px"
                              />
                            )}
                          </span>
                        </td>
                      );
                    case "button":
                      return (
                        <td
                          style={{
                            textAlign: val.textAlign,
                            cursor: "pointer",
                          }}
                          className={style.item}
                          key={index}
                          onClick={() => {
                            val.onClick && val.onClick(row);
                          }}
                        >
                          {val.text}
                        </td>
                      );
                    case "status":
                      return (
                        <td
                          style={{ textAlign: val.textAlign }}
                          className={style.item}
                          key={index}
                        >
                          {val.status &&
                            val.key !== undefined &&
                            (val.status[`${row[val.key]}`] ? (
                              <span
                                style={{
                                  color: val.status[`${row[val.key]}`].color,
                                  border: "1px solid",
                                  padding: "4px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  borderRadius: "4px",
                                  background:
                                    val.status[`${row[val.key]}`].background,
                                }}
                              >
                                {val.status[`${row[val.key]}`].text}
                              </span>
                            ) : (
                              `${row[val.key]}`
                            ))}
                        </td>
                      );
                    default:
                      return (
                        <td
                          style={{ textAlign: val.textAlign }}
                          className={style.item}
                          key={index}
                        >
                          {row[`${val.key}`]}
                        </td>
                      );
                  }
                })}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};
export default Table;
