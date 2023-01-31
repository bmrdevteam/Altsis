import { useAuth } from "contexts/authContext";
import _, { isArray, isNumber } from "lodash";
import React from "react";
import style from "../../editor.module.scss";

type Props = {
  blockData: any;
  auth: "edit" | "view";
  returnData: any;
  type: "timetable" | "archive" | "syllabus";
  defaultValues?: any;
  defaultTimetable?: any;
  dbData?: any;
};
const ParsedTableBlock = (props: Props) => {
  const { currentSchool } = useAuth();
  const SetColumn = () => {
    const columns = props.blockData?.data?.columns;
    if (columns && isArray(columns)) {
      const columnsSum = columns.reduce((a: number, b: number) => a + b, 0);
      let result = [];
      for (let i = 0; i < columns.length; i++) {
        result.push(
          <col width={`${(100 / columnsSum) * columns[i]}%`} key={i} />
        );
      }
      return <colgroup>{result}</colgroup>;
    }
    return <colgroup></colgroup>;
  };

  let repeat = _.get(
    props.dbData,
    props.blockData.data?.dataRepeat?.by.split("//")
  );
  // sort
  if (
    props.blockData.data?.dataRepeat?.by.split("//").includes("archive") &&
    repeat
  ) {
    const z =
      props.blockData.data?.dataRepeat?.by.split("//")[
        props.blockData.data?.dataRepeat?.by.split("//").length - 1
      ];
    for (const e of currentSchool.formArchive.find((o: any) => o.label === z)
      .fields) {
      if (e.runningTotal) {
        let track = 0;
        repeat.map((ob: any) => {
          track += parseFloat(ob[e.label]);

          return (ob[`${e.label}[누계합산]`] = track);
        });
      }
      if (e.total) {
        console.log(z);
        let track = 0;
        repeat.map((ob: any) => {
          track += parseFloat(ob[e.label]);
        });
        repeat.map((ob: any) => {
          return (ob[`${e.label}[합산]`] = track);
        });
      }
    }
  }

  const Cell = ({
    data,
    dataRepeatIndex,
    row,
  }: {
    data: any;
    dataRepeatIndex?: number;
    row: any;
  }) => {
    switch (data.type) {
      case "paragraph":
        return (
          <div
            className={style.cell}
            style={{ textAlign: data.align, fontSize: data.fontSize }}
          >
            {data.data?.text}
          </div>
        );

      case "data":
        return (
          <div
            className={style.cell}
            style={{ textAlign: data.align, fontSize: data.fontSize }}
          >
            {data?.dataText?.map((dataTextElement: any, index: number) => {
              if (typeof dataTextElement === "object") {
                if (dataTextElement.tag === "DATA") {
                  const locationArr = dataTextElement.location.split("//");
                  if (
                    isArray(_.get(props.dbData, locationArr.slice(0, -1), ""))
                  ) {
                    return (
                      isNumber(dataRepeatIndex) &&
                      _.get(props.dbData, locationArr.slice(0, -1), "")[
                        dataRepeatIndex
                      ][locationArr[locationArr.length - 1]]
                    );
                  } else {
                    return _.get(props.dbData, locationArr, "");
                  }
                }
                if (dataTextElement.tag === "BR") {
                  return <br key={index} />;
                }
              } else {
                return dataTextElement;
              }
            })}
          </div>
        );
      case "input":
        return props.auth === "edit" ? (
          <div
            className={`${style.cell} ${style.input}`}
            style={{ textAlign: data.align }}
            placeholder={data.placeholder ?? "입력"}
            contentEditable
            onClick={() => {}}
            defaultValue={props.returnData[data?.name]}
            suppressContentEditableWarning
            onInput={(e) => {
              if (data?.name === undefined) {
                props.returnData[data?.id] = e.currentTarget.textContent;
              } else {
                props.returnData[data?.name] = e.currentTarget.textContent;
              }
            }}
          >
            {props.returnData[data?.name] ?? props.returnData[data?.id] ?? ""}
          </div>
        ) : (
          <div>
            <div className={style.cell} style={{ textAlign: data.align }}>
              {props.defaultValues?.[data?.name]}
            </div>
          </div>
        );
      case "select":
        return props.auth === "edit" ? (
          <div
            className={`${style.cell} ${style.select}`}
            placeholder={data.placeholder ?? "입력"}
          >
            <select
              style={{ textAlign: data.align, fontSize: data.fontSize }}
              onChange={(e) => {
                if (data?.name === undefined) {
                  props.returnData[data?.id] = e.target.value;
                } else {
                  props.returnData[data?.name] = e.target.value;
                }
              }}
            >
              {data.options.map((val: any) => {
                return (
                  <option key={val.id} value={val.value}>
                    {val.text}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <div
            className={`${style.cell} ${style.select}`}
            placeholder={data.placeholder ?? "입력"}
          >
            <select
              style={{ textAlign: data.align, fontSize: data.fontSize }}
              onChange={(e) => {
                if (data?.name === undefined) {
                  props.returnData[data?.id] = e.target.value;
                } else {
                  props.returnData[data?.name] = e.target.value;
                }
              }}
              defaultValue={props.defaultValues?.[data?.name]}
              disabled={true}
            >
              {data.options.map((val: any) => {
                return (
                  <option key={val.id} value={val.value}>
                    {val.text}
                  </option>
                );
              })}
            </select>
          </div>
        );
      case "checkbox":
        if (
          props.defaultTimetable?.[data?.name] ||
          props.defaultTimetable?.[data?.id]
        ) {
          return (
            <div
              className={style.cell}
              style={{ textAlign: data.align, fontSize: data.fontSize }}
            >
              {props.defaultTimetable?.[data?.name] ??
                props.defaultTimetable?.[data?.id]}
            </div>
          );
        }
        return (
          <div
            className={style.cell}
            style={{ textAlign: data.align, fontSize: data.fontSize }}
          >
            {props.auth === "edit" && (
              <input
                type="checkbox"
                defaultChecked={
                  props.defaultValues?.[data?.id] === true ||
                  props.defaultValues?.[data?.name] === true
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    if (data?.name === undefined) {
                      props.returnData[data?.id] = {
                        name: data?.id,
                      };
                      if (props.type === "timetable") {
                        Object.assign(props.returnData[data?.id], {
                          start: row[0].timeRangeStart,
                          end: row[0].timeRangeEnd, 
                        });
                      }
                    } else {
                      props.returnData[data?.name] = {
                        name: data?.name,
                      };
                      if (props.type === "timetable") {
                        Object.assign(props.returnData[data?.name], {
                          start: row[0].timeRangeStart,
                          end: row[0].timeRangeEnd,
                        });
                      }
                    }
                  } else {
                    if (data?.name === undefined) {
                      delete props.returnData[data?.id];
                    } else {
                      delete props.returnData[data?.name];
                    }
                  }
                  console.log(props.returnData);
                }}
              />
            )}
          </div>
        );
      case "timeRange":
        return (
          <div className={style.cell} style={{ textAlign: data.align }}>
            {data.timeRangeStart}
            {" ~ "}
            {data.timeRangeEnd}
          </div>
        );

      default:
        return (
          <div className={style.cell} style={{ textAlign: data.align }}>
            {data.data?.text}
          </div>
        );
    }
  };

  let spanTrack: {
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
  }[] = [];
  return (
    <div
      className={style.parsed_block}
      style={{ width: `${props.blockData.data.width ?? 100}%` }}
    >
      <table
        className={style.table}
        style={{ fontSize: props.blockData.data?.fontSize }}
      >
        <SetColumn />
        <tbody>
          {props.blockData.data.table.map((value: any[], index: number) => {
            if (props.blockData.data.dataRepeat?.index === index) {
              return (
                repeat &&
                repeat.map((v: any, i: number) => {
                  if (props.blockData.data.dataFilter?.length > 0) {
                    let boolCount: number = 0;
                    let boola: string = "";
                    props.blockData.data.dataFilter?.map(
                      (filter: any, iasd: number) => {
                        boola = boola.concat(
                          `${iasd}${v?.[filter.by]} ${filter.operator} ${
                            filter.value
                          }`
                        );
                        if (
                          filter.operator === "===" &&
                          v?.[filter.by] !== undefined &&
                          v?.[filter.by] !== filter.value
                        ) {
                          boolCount += 1;
                        }

                        if (
                          filter.operator === "!==" &&
                          v?.[filter.by] !== undefined &&
                          v?.[filter.by] === filter.value
                        ) {
                          boolCount += 1;
                        }
                      }
                    );
                    if (boolCount > 0) {
                      return;
                    }
                  }

                  return (
                    <tr key={`${index}-${i}`}>
                      {value.map((val, ind: number) => {
                        const spanTrackCurr = spanTrack.filter((track) => {
                          if (
                            track.rowStart <= i + index &&
                            track.rowEnd > i + index &&
                            track.colStart <= ind &&
                            track.colEnd > ind
                          ) {
                            return true;
                          }

                          return false;
                        });

                        if (spanTrackCurr.length > 0) {
                          return;
                        }

                        spanTrack.push({
                          rowStart: i,
                          rowEnd:
                            i +
                            (isNaN(parseInt(val.rowSpan))
                              ? 1
                              : Math.abs(parseInt(val.rowSpan))),
                          colStart: ind,
                          colEnd:
                            ind +
                            (isNaN(parseInt(val.colSpan))
                              ? 1
                              : Math.abs(parseInt(val.colSpan))),
                        });
                        return val?.isHeader ? (
                          <th
                            key={`${i}-${ind}`}
                            colSpan={val?.colSpan}
                            rowSpan={val?.rowSpan}
                            style={{ fontSize: val?.fontSize }}
                          >
                            <Cell data={val} dataRepeatIndex={i} row={value} />
                          </th>
                        ) : (
                          <td
                            key={`${i}-${ind}`}
                            colSpan={val?.colSpan}
                            rowSpan={val?.rowSpan}
                            style={{ fontSize: val?.fontSize }}
                          >
                            <Cell data={val} dataRepeatIndex={i} row={value} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              );
            } else {
              return (
                <tr key={index}>
                  {value.map((val, ind: number) => {
                    const spanTrackCurr = spanTrack.filter((v) => {
                      if (
                        v.rowStart <= index &&
                        v.rowEnd > index &&
                        v.colStart <= ind &&
                        v.colEnd > ind
                      ) {
                        return true;
                      }

                      return false;
                    });

                    if (spanTrackCurr.length > 0) {
                      return;
                    }

                    spanTrack.push({
                      rowStart: index,
                      rowEnd:
                        index +
                        (isNaN(parseInt(val.rowSpan))
                          ? 1
                          : Math.abs(parseInt(val.rowSpan))),
                      colStart: ind,
                      colEnd:
                        ind +
                        (isNaN(parseInt(val.colSpan))
                          ? 1
                          : Math.abs(parseInt(val.colSpan))),
                    });
                    return val?.isHeader ? (
                      <th
                        key={ind}
                        colSpan={val?.colSpan}
                        rowSpan={val?.rowSpan}
                        style={{ fontSize: val?.fontSize }}
                      >
                        <Cell data={val} row={value} />
                      </th>
                    ) : (
                      <td
                        key={ind}
                        colSpan={val?.colSpan}
                        rowSpan={val?.rowSpan}
                        style={{ fontSize: val?.fontSize }}
                      >
                        <Cell data={val} row={value} />
                      </td>
                    );
                  })}
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ParsedTableBlock;
