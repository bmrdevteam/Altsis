import React, {useCallback, useEffect, useState} from "react";
import style from "./table.module.scss";
import _, { add, isArray, isBoolean, isNumber } from "lodash";
import Svg from "assets/svg/Svg";
import {
  dateFormat,
  flattenObject,
  objectDownloadAsCSV,
  objectDownloadAsJson,
  unflattenObject,
} from "functions/functions";
import useOutsideClick from "hooks/useOutsideClick";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Button from "components/button/Button";

type TTableItems =
  | "text"
  | "checkbox"
  | "toggle"
  | "button"
  | "rowEdit"
  | "status"
  | "input"
  | "input-number"
  | "select"
  | "date"
  | "rowOrder"
  | "enrolled";
export type TTableHeader = {
  text: string;
  type: TTableItems;
  key?: string;
  width?: string;
  byteCalc?: boolean;
  whiteSpace?: "pre" | "pre-wrap" | "normal";
  wordBreak?: "normal" | "break-all" | "keep-all" | "break-word";
  textAlign?: "left" | "center" | "right";
  fontSize?: string;
  fontWeight?:
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  cursor?: string;
  status?: {
    [key: string]: {
      text?: string;
      color?: string;
      background?: string;
      onClick?: (value: any) => void;
    };
  };
  btnStyle?: {
    round?: boolean;
    color?: string;
    background?: string;
    padding?: string;
    border?: boolean;
  };
  option?: string[];
  enrolled?: string[];
  onClick?: (value: any) => void;
};
type Props = {
  type: "object-array" | "string-array";
  data: any[] | string[];
  header: TTableHeader[];
  control?: boolean;
  defaultPageBy?: 0 | 10 | 50 | 100 | 200;
  onChange?: (value: any[]) => void;
  menus?: { onClick: () => void; label: string }[];
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
  const [addRowData, setAddRowData] = useState<any>(
    props.header
      .filter((val) => val.key)
      .map((h) => {
        if (h.key) return h.key;
      })
      .reduce((acc: any, value) => {
        acc[`${value}`] = "";
        return acc;
      }, {})
  );
  const moreOutSideClick = useOutsideClick();
  const filteredData = useCallback(() => {
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
              param === parseFloat(tableData.searchParam)
            );
          }

          return param
            .toString()
            .toLowerCase()
            .includes(tableData.searchParam.toLowerCase());
        }
        return false;
      });
      result = _.sortBy(result, tableData.orderBy);
    }

    if (tableData.order === "asc") result.reverse();

    return result;
  }, [tableData]);

  function slicedTableData() {
    if (tableSettings.pageBy !== 0) {
      const pageStart = tableSettings.pageBy * (tableSettings.pageIndex - 1);
      const pageEnd = tableSettings.pageBy * tableSettings.pageIndex;
      return filteredData().slice(pageStart, pageEnd);
    }
    return filteredData();
  }
  useEffect(() => {
    if (props.type === "object-array") {
      setTableData((prev) => ({
        ...prev,
        data: props.data
        ? props.data.map((val, index) => ({
            ...flattenObject(val),
            // tableRowId: generateRandomId(8),
            tableRowIndex: index + 1,
          }))
        : [],
      }));
      setAddRowData(
        props.header
          .filter((val) => val.key)
          .map((h) => {
            if (h.key) return h.key;
          })
          .reduce((acc: any, value) => {
            acc[`${value}`] = "";
            return acc;
          }, {})
      );
    } else {
      setTableData((prev) => ({
        ...prev,
        data: props.data
        ? props.data.map((val, index) => ({
            ...[val],
            tableRowIndex: index + 1,
          }))
        : [],
      }));
    }
  }, [props.data]);
  function callOnChangeFunc(data?: any) {
    if (props.onChange) {
      if (data) {
        props.onChange([...data]);
      } else {
        props.onChange([...tableData.data]);
      }
    }
  }

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
    <div className={style.table_container}>
      <table className={style.table}>
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
                        setTableSettings((prev) => ({
                          ...prev,
                          pageIndex: 1,
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
                          const number = isNaN(parseFloat(e.target.value))
                            ? 1
                            : parseFloat(e.target.value);
                          if (
                            number > 0 &&
                            tableSettings.pageBy !== 0 &&
                            number <
                              tableData.data.length / tableSettings.pageBy
                          ) {
                            setTableSettings((prev) => ({
                              ...prev,
                              pageIndex: number,
                            }));
                          }
                          if (
                            tableSettings.pageBy !== 0 &&
                            number >
                              tableData.data.length / tableSettings.pageBy
                          ) {
                            setTableSettings((prev) => ({
                              ...prev,
                              pageIndex: isNaN(
                                parseFloat(e.target.value.slice(-1))
                              )
                                ? 1
                                : parseFloat(e.target.value.slice(-1)),
                            }));
                          }
                        }}
                      />
                      /
                      <span
                        style={{
                          padding: "0 6px",
                          display: "flex",
                          fontSize: "13px",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 500,
                        }}
                      >
                        {tableSettings.pageBy !== 0
                          ? Math.ceil(
                              tableData.data.length / tableSettings.pageBy
                            )
                          : 1}
                      </span>
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
                            pageBy: parseFloat(e.target.value),
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
                      {moreOutSideClick.active &&
                        (!props.menus ? (
                          <div className={style.menu_container}>
                            <div
                              className={style.menu_item}
                              onClick={() => {
                                const headers = props.header
                                  .map((o) => {
                                    return o.key;
                                  })
                                  .filter((o) => {
                                    if (o) {
                                      return true;
                                    }
                                    return false;
                                  });

                                objectDownloadAsCSV(
                                  filteredData().map((o: any) => {
                                    return unflattenObject(
                                      Object.fromEntries(
                                        Object.entries(o).filter(([key]) =>
                                          headers.includes(key)
                                        )
                                      )
                                    );
                                  })
                                );
                              }}
                            >
                              CSV로 다운로드
                            </div>
                            <div
                              className={style.menu_item}
                              onClick={() => {
                                const headers = props.header
                                  .map((o) => {
                                    return o.key;
                                  })
                                  .filter((o) => {
                                    if (o) {
                                      return true;
                                    }
                                    return false;
                                  });
                                objectDownloadAsJson(
                                  filteredData().map((o: any) => {
                                    return unflattenObject(
                                      Object.fromEntries(
                                        Object.entries(o).filter(([key]) =>
                                          headers.includes(key)
                                        )
                                      )
                                    );
                                  })
                                );
                              }}
                            >
                              JSON으로 다운로드
                            </div>
                          </div>
                        ) : (
                          <div className={style.menu_container}>
                            {props.menus.map((menu) => (
                              <div
                                className={style.menu_item}
                                onClick={menu.onClick}
                              >
                                {menu.label}
                              </div>
                            ))}
                          </div>
                        ))}
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
                    height: "1px",
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
                    filteredData().filter((c) => !c.tableRowChecked).length ===
                    0;
                  const allEmpty =
                    tableData.data.filter((c) => c.tableRowChecked).length ===
                    0;
                  const checkTo = (to: boolean) => {
                    let arr: any[] = tableData.data;
                    filteredData().forEach((e) => {
                      arr[
                        arr.findIndex(
                          (obj) => obj.tableRowIndex === e.tableRowIndex
                        )
                      ].tableRowChecked = to;
                    });
                    return arr;
                  };

                  return (
                    <th
                      style={{
                        textAlign: val.textAlign,
                        minWidth: val.width,
                        maxWidth: val.width,
                      }}
                      className={style.item_container}
                      key={index}
                      onClick={() => {
                        if (allEmpty) {
                          setTableData((prev) => {
                            callOnChangeFunc(checkTo(true));
                            return { ...prev, data: checkTo(true) };
                          });
                        } else {
                          setTableData((prev) => {
                            callOnChangeFunc(checkTo(false));
                            return { ...prev, data: checkTo(false) };
                          });
                        }
                        // callOnChangeFunc();
                      }}
                    >
                      <span className={style.icon}>
                        {allChecked && filteredData().length !== 0 ? (
                          <Svg
                            type="checkboxChecked"
                            width="20px"
                            height="20px"
                          />
                        ) : allEmpty ? (
                          <Svg type="checkbox" width="20px" height="20px" />
                        ) : (
                          <Svg
                            type="checkboxMinus"
                            width="20px"
                            height="20px"
                          />
                        )}
                      </span>
                    </th>
                  );
                default:
                  return (
                    <th
                      style={{
                        textAlign: val.textAlign,
                        minWidth: val.width,
                        width: val.width,
                        maxWidth: val.width,
                      }}
                      className={style.item_container}
                      key={index}
                      onClick={() => {
                        handleHeaderOnClick(val);
                      }}
                    >
                      <div className={style.item}>
                        <span className={style.icon}>
                          {tableData.orderBy === val.key &&
                            tableData.order === "asc" && (
                              <Svg type="chevronUp" />
                            )}
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
          {props.header.filter((h) => h.type === "rowEdit").length > 0 && (
            <tr key={"tableAddRow"}>
              {props.header.map((val, index) => {
                switch (val.type) {
                  case "checkbox":
                    return (
                      <td
                        style={{ textAlign: val.textAlign }}
                        className={`${style.item} ${style.checkbox}`}
                        key={index}
                      >
                        <span className={style.icon}>
                          <Svg type="checkbox" width="20px" height="20px" />
                        </span>
                      </td>
                    );
                  case "toggle":
                    return (
                      <td
                        style={{ textAlign: val.textAlign }}
                        className={`${style.item} ${style.toggle}`}
                        key={index}
                      >
                        <ToggleSwitch
                          onChange={(b) => {
                            setAddRowData((prev: any) => ({
                              ...prev,
                              [`${val.key}`]: b,
                            }));
                          }}
                        />
                      </td>
                    );
                  case "button":
                    return (
                      <td
                        style={{
                          textAlign: val.textAlign,
                          fontSize: val.fontSize,
                          fontWeight: val.fontWeight,
                          cursor: "pointer",
                        }}
                        className={style.item}
                        key={index}
                      >
                        <span
                          style={{
                            color: val.btnStyle?.color,
                            background: val.btnStyle?.background,
                            border: val.btnStyle?.border ? "1px solid" : "",
                            borderRadius: val.btnStyle?.round ? "4px" : "",
                            padding: val.btnStyle?.padding,
                          }}
                        >
                          {val.text}
                        </span>
                      </td>
                    );
                  case "status":
                    return (
                      <td
                        style={{ textAlign: val.textAlign }}
                        className={`${style.item} ${style.input}`}
                        key={index}
                      >
                        {val.status && (
                          <select
                            value={addRowData[`${val.key}`]}
                            onChange={(e) => {
                              setAddRowData((prev: any) => ({
                                ...prev,
                                [`${val.key}`]: e.target.value,
                              }));
                            }}
                          >
                            <option value="" key={"none"}></option>
                            {Object.keys(val.status as any).map((a, index) => {
                              return (
                                <option key={index} value={a}>
                                  {val.status?.[`${a}`].text}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </td>
                    );
                  case "input-number":
                    return (
                      <td
                        style={{
                          whiteSpace: val.whiteSpace,
                          wordBreak: val.wordBreak,
                          textAlign: val.textAlign,
                          fontSize: val.fontSize,
                          fontWeight: val.fontWeight,
                        }}
                        className={`${style.item} ${style.input}`}
                        key={index}
                      >
                        <input
                          value={addRowData[`${val.key}`]}
                          type="number"
                          onChange={(e) => {
                            setAddRowData((prev: any) => ({
                              ...prev,
                              [`${val.key}`]: e.target.value,
                            }));
                          }}
                        />
                        {val.byteCalc && (
                          <div className={style.byte_calc}>
                            {
                              encodeURIComponent(addRowData[`${val.key}`])
                                .length
                            }{" "}
                            bytes
                          </div>
                        )}
                      </td>
                    );
                  case "select":
                    return (
                      <td
                        style={{
                          whiteSpace: val.whiteSpace,
                          wordBreak: val.wordBreak,
                          textAlign: val.textAlign,
                          fontSize: val.fontSize,
                          fontWeight: val.fontWeight,
                        }}
                        className={`${style.item} ${style.input}`}
                        key={index}
                      >
                        <select
                          value={addRowData[`${val.key}`]}
                          onChange={(e) => {
                            setAddRowData((prev: any) => ({
                              ...prev,
                              [`${val.key}`]: e.target.value,
                            }));
                          }}
                        >
                          <option key={`nothing`} value={""}></option>
                          {val.option?.map((opt, index) => {
                            return (
                              <option key={`${opt}-${index}`} value={opt}>
                                {opt}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    );
                  case "rowEdit":
                    return (
                      <td
                        style={{
                          textAlign: val.textAlign,
                          fontSize: val.fontSize,
                          fontWeight: val.fontWeight,
                          cursor: "pointer",
                        }}
                        className={style.item}
                        key={index}
                        onClick={() => {
                          let data: any = [];
                          if (tableData.data.length > 0) {
                            data = [
                              ...tableData.data,
                              {
                                tableRowIndex:
                                  Math.max(
                                    ...tableData.data.map(
                                      (obj) => obj.tableRowIndex
                                    )
                                  ) + 1,
                                ...addRowData,
                              },
                            ];
                          } else {
                            data = [
                              ...tableData.data,
                              {
                                tableRowIndex: 1,
                                ...addRowData,
                              },
                            ];
                          }

                          setTableData((prev) => {
                            return {
                              ...prev,
                              data: data,
                            };
                          });
                          callOnChangeFunc(data);
                        }}
                      >
                        <span
                          style={{
                            color: "blue",
                            border: "1px solid",
                            borderRadius: "4px",
                            padding: "4px",
                          }}
                        >
                          {"추가"}
                        </span>
                      </td>
                    );
                  default:
                    return (
                      <td
                        style={{
                          whiteSpace: val.whiteSpace,
                          wordBreak: val.wordBreak,
                          textAlign: val.textAlign,
                          fontSize: val.fontSize,
                          fontWeight: val.fontWeight,
                        }}
                        className={`${style.item} ${style.input}`}
                        key={index}
                      >
                        <textarea
                          rows={1}
                          onKeyUp={(e) => {
                            const scrollHeight = e.currentTarget.scrollHeight;
                            e.currentTarget.style.height = scrollHeight + "px";
                          }}
                          value={addRowData[`${val.key}`]}
                          onChange={(e) => {
                            setAddRowData((prev: any) => ({
                              ...prev,
                              [`${val.key}`]: e.target.value,
                            }));
                          }}
                        ></textarea>
                        {val.byteCalc && (
                          <div className={style.byte_calc}>
                            {
                              encodeURIComponent(addRowData[`${val.key}`])
                                .length
                            }{" "}
                            bytes
                          </div>
                        )}
                      </td>
                    );
                }
              })}
            </tr>
          )}
          {props.data &&
            isArray(props.data) &&
            slicedTableData().map((row, rowIndex) => {
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
                              arr[ii].tableRowChecked =
                                !arr[ii].tableRowChecked;
                              setTableData((prev) => ({
                                ...prev,
                                data: arr,
                              }));
                              callOnChangeFunc();
                            }}
                          >
                            <span className={style.icon}>
                              {!row.tableRowChecked ? (
                                <Svg
                                  type="checkbox"
                                  width="20px"
                                  height="20px"
                                />
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
                      case "toggle":
                        return (
                          <td
                            style={{ textAlign: val.textAlign }}
                            className={`${style.item} ${style.toggle}`}
                            key={index}
                          >
                            <ToggleSwitch
                              defaultChecked={row[`${val.key}`]}
                              onChange={(b) => {
                                const arr = [...tableData.data];
                                const ii = arr.findIndex(
                                  (r) => r.tableRowIndex === row.tableRowIndex
                                );
                                arr[ii][`${val.key}`] = !arr[ii][`${val.key}`];
                                setTableData((prev) => ({
                                  ...prev,
                                  data: arr,
                                }));
                                callOnChangeFunc();
                              }}
                            />
                          </td>
                        );
                      case "button":
                        return (
                          <td
                            style={{
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                              cursor: "pointer",
                            }}
                            className={style.item}
                            key={index}
                            onClick={() => {
                              val.onClick && val.onClick(row);
                            }}
                          >
                            <span
                              style={{
                                color: val.btnStyle?.color,
                                background: val.btnStyle?.background,
                                border: val.btnStyle?.border ? "1px solid" : "",
                                borderRadius: val.btnStyle?.round ? "4px" : "",
                                padding: val.btnStyle?.padding,
                              }}
                            >
                              {val.text}
                            </span>
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
                                    fontSize: val.fontSize,
                                    fontWeight: val.fontWeight,
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    background:
                                      val.status[`${row[val.key]}`].background,
                                  }}
                                  onClick={() => {
                                    if (
                                      val.status &&
                                      val.key !== undefined &&
                                      val.status[`${row[val.key]}`].onClick
                                    ) {
                                      val.status[`${row[val.key]}`].onClick?.(
                                        row
                                      );
                                    }

                                    // val.status?.[row[`${val.key}`]].onClick &&
                                    //   val.status[row[`${val.key}`]].onClick?.(
                                    //     row
                                    //   );
                                  }}
                                >
                                  {val.status[`${row[val.key]}`].text}
                                </span>
                              ) : (
                                `${row[val.key]}`
                              ))}
                          </td>
                        );
                      case "input":
                        return (
                          <td
                            style={{
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                            }}
                            className={`${style.item} ${style.input}`}
                            key={index}
                          >
                            <textarea
                              rows={1}
                              onFocus={(e) => {
                                e.currentTarget.style.height =
                                  e.currentTarget.scrollHeight + "px";
                                e.currentTarget.style.width = "100%"; // 최소 너비는 100%로 설정
                                if (e.currentTarget.offsetWidth < 300) {
                                  e.currentTarget.style.width = "300px"; // 최소 너비가 300px보다 작을 경우 300px로 조정
                                }
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.height =
                                  e.currentTarget.scrollHeight + "px";
                                e.currentTarget.style.width = "100%"; // 최소 너비는 100%로 설정
                              }}
                              style={{
                                whiteSpace: val.whiteSpace,
                                wordBreak: val.wordBreak,
                              }}
                              value={row[`${val.key}`]}
                              onChange={(e) => {
                                const arr = [...tableData.data];
                                const ii = tableData.data.findIndex(
                                  (r) => r.tableRowIndex === row.tableRowIndex
                                );
                                arr[ii][`${val.key}`] = e.target.value;
                                arr[ii].isModified = true;
                                setTableData((prev) => ({
                                  ...prev,
                                  data: arr,
                                }));
                                callOnChangeFunc();
                              }}
                            ></textarea>
                            {val.byteCalc && (
                              <div className={style.byte_calc}>
                                {encodeURIComponent(row[`${val.key}`]).length}{" "}
                                bytes
                              </div>
                            )}
                          </td>
                        );
                      case "input-number":
                        return (
                          <td
                            style={{
                              whiteSpace: val.whiteSpace,
                              wordBreak: val.wordBreak,
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                            }}
                            className={`${style.item} ${style.input}`}
                            key={index}
                          >
                            <input
                              value={parseFloat(row[`${val.key}`]) || 0}
                              type="number"
                              onChange={(e) => {
                                const arr = [...tableData.data];
                                const ii = tableData.data.findIndex(
                                  (r) => r.tableRowIndex === row.tableRowIndex
                                );
                                arr[ii][`${val.key}`] = parseFloat(
                                  e.target.value
                                );
                                arr[ii].isModified = true;
                                setTableData((prev) => ({
                                  ...prev,
                                  data: arr,
                                }));
                                callOnChangeFunc();
                              }}
                            />
                            {val.byteCalc && (
                              <div className={style.byte_calc}>
                                {encodeURIComponent(row[`${val.key}`]).length}{" "}
                                bytes
                              </div>
                            )}
                          </td>
                        );
                      case "select":
                        return (
                          <td
                            style={{
                              whiteSpace: val.whiteSpace,
                              wordBreak: val.wordBreak,
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                            }}
                            className={`${style.item} ${style.input}`}
                            key={index}
                          >
                            <select
                              value={row[`${val.key}`]}
                              onChange={(e) => {
                                const arr = [...tableData.data];
                                const ii = tableData.data.findIndex(
                                  (r) => r.tableRowIndex === row.tableRowIndex
                                );
                                arr[ii][`${val.key}`] = e.target.value;
                                arr[ii].isModified = true;
                                setTableData((prev) => ({
                                  ...prev,
                                  data: arr,
                                }));
                                callOnChangeFunc();
                              }}
                            >
                              <option key={`nothing`} value={""}></option>
                              {val.option?.map((opt, index) => {
                                return (
                                  <option key={`${opt}-${index}`} value={opt}>
                                    {opt}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                        );
                      case "rowEdit":
                        return (
                          <td
                            style={{
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                              cursor: "pointer",
                            }}
                            className={style.item}
                            key={index}
                            onClick={() => {
                              // 팝업 띄우는 메세지 추가 25.01.06 devgoodway
                              if (!window.confirm("정말 삭제하시겠습니까?")) {
                                return;
                              }
                              setTableData((prev) => {
                                callOnChangeFunc(
                                  prev.data.filter(
                                    (a) => a.tableRowIndex !== row.tableRowIndex
                                  )
                                );
                                return {
                                  ...prev,
                                  data: prev.data.filter(
                                    (a) => a.tableRowIndex !== row.tableRowIndex
                                  ),
                                };
                              });
                            }}
                          >
                            <span
                              style={{
                                color: "red",
                                border: "1px solid",
                                borderRadius: "4px",
                                padding: "4px",
                              }}
                            >
                              {"삭제"}
                            </span>
                          </td>
                        );
                      case "date":
                        return (
                          <td
                            style={{
                              whiteSpace: val.whiteSpace,
                              wordBreak: val.wordBreak,
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                            }}
                            className={style.item}
                            key={index}
                          >
                            {row[`${val.key}`] &&
                              dateFormat(new Date(row[`${val.key}`]))}
                          </td>
                        );
                      case "rowOrder":
                        return (
                          <td
                            style={{
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                              cursor: "pointer",
                            }}
                            className={style.item}
                            key={index}
                          >
                            <span
                              style={{
                                color: "gray",
                                border: "1px solid",
                                borderRadius: "4px",
                                padding: "4px",
                                display: "flex",
                              }}
                            >
                              <Button
                                type="ghost"
                                style={{ maxHeight: "16px" }}
                                onClick={() => {
                                  if (row.tableRowIndex === 1) {
                                    return;
                                  }
                                  /* swap */
                                  setTableData((prev) => {
                                    const newData = [...prev.data];
                                    const temp = newData[row.tableRowIndex - 1];
                                    newData[row.tableRowIndex - 1] =
                                      newData[row.tableRowIndex - 2];
                                    newData[row.tableRowIndex - 2] = temp;
                                    callOnChangeFunc(newData);
                                    return {
                                      ...prev,
                                      data: newData,
                                    };
                                  });
                                }}
                              >
                                ↑
                              </Button>
                              <Button
                                style={{ maxHeight: "16px" }}
                                type="ghost"
                                onClick={() => {
                                  if (
                                    row.tableRowIndex === tableData.data.length
                                  ) {
                                    return;
                                  }
                                  /* swap */
                                  setTableData((prev) => {
                                    const newData = [...prev.data];
                                    const temp = newData[row.tableRowIndex];
                                    newData[row.tableRowIndex] =
                                      newData[row.tableRowIndex - 1];
                                    newData[row.tableRowIndex - 1] = temp;
                                    callOnChangeFunc(newData);
                                    return {
                                      ...prev,
                                      data: newData,
                                    };
                                  });
                                }}
                              >
                                ↓
                              </Button>
                            </span>
                          </td>
                        );

                      default:
                        return (
                          <td
                            style={{
                              whiteSpace: val.whiteSpace,
                              wordBreak: val.wordBreak,
                              textAlign: val.textAlign,
                              fontSize: val.fontSize,
                              fontWeight: val.fontWeight,
                              cursor: val.cursor || 'default',
                            }}
                            className={style.item}
                            key={index}
                            onClick={(_e) => { if(typeof(val.onClick) !== 'undefined') val.onClick(row) }}
                          >
                            {row[`${val.key}`]}
                            {val.byteCalc && (
                              <div className={style.byte_calc}>
                                {encodeURIComponent(row[`${val.key}`]).length}{" "}
                                bytes
                              </div>
                            )}
                          </td>
                        );
                    }
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};
export default Table;
