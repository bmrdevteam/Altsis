import { useAuth } from "contexts/authContext";
import _, { filter, forEach, isArray, isNumber, isObject } from "lodash";
import React, { useState } from "react";
import style from "../../editor.module.scss";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  blockData: any;
  auth: "edit" | "view";
  returnData: any;
  type: "timetable" | "archive" | "syllabus";
  defaultValues?: any;
  defaultTimetable?: any;
  idTimetable?: any;
  onClickCourse?: any;
  dbData?: any;
};

const ParsedTableBlock = (props: Props) => {
  const { currentSchool } = useAuth();
  const { FileAPI } = useAPIv2();

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
  let repeat = _.cloneDeep(_.get(
    props.dbData,
    props.blockData.data?.dataRepeat?.by.split("//")
  ));

  const sortInfo = _.get(props.blockData.data,"dataOrder");
  const sortByArray = _.map(sortInfo, 'by');
  const sortOrderArray = _.map(sortInfo, 'order');
  const sortPriorityArray = _.map(sortInfo, 'priority');
  
  let matchedItem : any[] = []; // 우선순위와 일치하는 아이템을 저장할 배열
  let unmatchedItem : any[] = []; // 우선순위와 일치하지 않는 아이템을 저장할 배열
  
  _.forEach(sortPriorityArray, (item : any, index : number) => {
    if(item){
      const priorityArray = item.split("/");
      const byArray = sortByArray[index];
      _.forEach(priorityArray, (item : any, index : number) => {
        matchedItem = [...matchedItem, ..._.orderBy(_.filter(repeat, (v) => v[byArray] === item ),sortByArray, sortOrderArray)];
      });
    }
  });
  
  // 우선순위와 일치하지 않는 아이템 찾기
  unmatchedItem = _.orderBy(_.difference(repeat, matchedItem), sortByArray, sortOrderArray);
  
  // 우선순위와 일치하는 아이템과 일치하지 않는 아이템을 합친 후 repeat 배열을 갱신
  repeat = [...matchedItem, ...unmatchedItem];
  
  // 필터

// CELL 필터
  let cellName : any [] = [];
  // filteredRepeat 배열의 각 항목에 대해 반복합니다.
  _.forEach(repeat, (item : any, index : number) => {
    // props로 전달된 dataCellFilter가 비어있지 않은 경우에만 아래 코드 블록을 실행합니다.
    if (props.blockData.data.dataCellFilter?.length > 0) {
      // dataCellFilter 배열의 각 filter에 대해 반복합니다.
      _.forEach(props.blockData.data.dataCellFilter, (filter: any, iasd: number) => {
        // 조건에 따라 filter.cell 값을 cellName 배열에 추가합니다.
        if (
          filter.operator === "===" &&
          item?.[filter.by] &&
          String(item?.[filter.by]) !== String(filter.value)
        ) {
          cellName = [...cellName, filter.cell];
        }
        if (
          filter.operator === "!==" &&
          item?.[filter.by] &&
          String(item?.[filter.by]) === String(filter.value)
        ) {
          cellName = [...cellName, filter.cell];
        }
        if (
          filter.operator === "!==" &&
          !filter.value &&
          !String(item?.[filter.by]) === !String(filter.value)
        ) {
          cellName = [...cellName, filter.cell];
        }
      })
      // cellName 배열에 저장된 값들에 대해 반복합니다.
      _.forEach(cellName, (cv: any, ci: number) => {      
        // item[cv] 값을 빈 문자열로 변경하여 해당 데이터 항목의 값을 비웁니다.
        item[cv] = null;
      })
      // 작업이 끝난 후, cellName 배열을 초기화합니다.
      cellName = [];
    }
  });
  
  let filteredRepeat: any[] = repeat?.filter((v: any, i: number) => {
     // AND 필터
    if (props.blockData.data.dataFilter?.length > 0) {
      let boolCount: number = 0;
      props.blockData.data.dataFilter?.map((filter: any, iasd: number) => {
        if (
          filter.operator === "===" &&
          v?.[filter.by] &&
          String(v?.[filter.by]) !== String(filter.value)
        ) {
          boolCount += 1;
        }
        if (
          filter.operator === "!==" &&
          v?.[filter.by] &&
          String(v?.[filter.by]) === String(filter.value)
        ) {
          boolCount += 1;
        }
        if (
          filter.operator === "!==" &&
          !filter.value &&
          !String(v?.[filter.by]) === !String(filter.value)
        ) {
          boolCount += 1;
        }
      });
      if (boolCount > 0) {
        return false;
      }
    }
    // OR 필터
    if (props.blockData.data.dataOrFilter?.length > 0) {
      let boolCount: number = 0;
      let orCount: number = 0;
      props.blockData.data.dataOrFilter?.map((filter: any, iasd: number) => {
        if (
          filter.operator === "===" &&
          v?.[filter.by] &&
          String(v?.[filter.by]) !== String(filter.value)
        ) {
          boolCount += 1;
        }
        if (
          filter.operator === "!==" &&
          v?.[filter.by] &&
          String(v?.[filter.by]) === String(filter.value)
        ) {
          boolCount += 1;
        }
        if (
          filter.operator === "!==" &&
          !filter.value &&
          !String(v?.[filter.by]) === !String(filter.value)
        ) {
          boolCount += 1;
        }
        orCount += 1;
      });
      if (boolCount === orCount) {
        return false;
      }
    }
  return true;
});

  // sort
  if (
    props.blockData.data?.dataRepeat?.by.split("//").includes("archive") &&
    repeat
  ) {
    const z =
      props.blockData.data?.dataRepeat?.by.split("//")[
        props.blockData.data?.dataRepeat?.by.split("//").length - 1
      ];
    for (const e of currentSchool?.formArchive.find((o: any) => o.label === z)
      ?.fields ?? []) {
      if (e.runningTotal) {
        let track = 0;
        for (const ob of filteredRepeat) {
          // parseFloat(ob?.[e.label])의 값이 없는 경우 0을 대입한다.
          if(parseFloat(ob?.[e.label])){
            track += parseFloat(ob?.[e.label]);
          }else{
            track += 0;
          }
          ob[`${e.label}[누계합산]`] = track;
        }
      }
      if (e.total) {
        if (e.type === "input-number") {
          let track = 0;
          for (const ob of filteredRepeat) {
            // parseFloat(ob?.[e.label])의 값이 0이 아닌 경우
            if(parseFloat(ob?.[e.label])){
            track += parseFloat(ob?.[e.label]);
            }
          }
          for (const ob of filteredRepeat) {
            ob[`${e.label}[합산]`] = track;
          }
        } else {
          let track = "";
          for (const ob of filteredRepeat) {
            track += ob?.[e.label];
          }
          for (const ob of filteredRepeat) {
            ob[`${e.label}[합산]`] = track;
          }
        }
      }
    }
  }

  //evaluation total
  let trackList : any = {};
  for(const e of filteredRepeat){
    for(const k of Object.keys(e)){
      if(k.includes("단위수")){
        if(trackList[`${k}[합산]`]){
          trackList[`${k}[합산]`] += parseFloat(e[k]);
        }else{
          trackList[`${k}[합산]`] = parseFloat(e[k]);
        }
      }
    }
  }
  for(const e of filteredRepeat){
    for(const k of Object.keys(e)){
      if(k.includes("단위수")){
        e[`${k}[합산]`] = trackList[`${k}[합산]`];
      }
    }
  }

  const Cell = ({
    data,
    dataRepeatIndex,
    dataRepeat,
    row,
    table,
    colIndex,
  }: {
    data: any;
    dataRepeat?: any[];
    dataRepeatIndex?: number;
    row: any;
    table: any;
    colIndex: number;
  }) => {
    const [url, setUrl] = useState<string>("");

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
                    // isArray(_.get(props.dbData, locationArr.slice(0, -1), ""))
                    !dataRepeat
                  ) {
                    // return (
                    //   isNumber(dataRepeatIndex) &&
                    //   _.get(props?.dbData, locationArr.slice(0, -1), "")[
                    //     dataRepeatIndex
                    //   ][locationArr[locationArr.length - 1]]
                    // );
                    const result = _.get(props.dbData, locationArr, "");

                    // if data is image
                    if (
                      isObject(result) &&
                      "key" in result &&
                      "originalName" in result
                    ) {
                      const key = result.key as string;
                      const originalName = result.originalName as string;
                      return (
                        <div style={{ margin: "auto" }}>
                          <img
                            src={url}
                            onError={async (e) => {
                              e.currentTarget.onerror = null;
                              FileAPI.RSignedUrlDocument({
                                query: {
                                  key,
                                  fileName: originalName,
                                },
                              }).then(({ preSignedUrl }) => {
                                setUrl(preSignedUrl);
                              });
                            }}
                            alt="undefined"
                          />
                        </div>
                      );
                    }
                    return `${_.get(props.dbData, locationArr, "")}`;
                  } else {
                    return dataRepeat?.[locationArr[locationArr.length - 1]];
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
            data-inputrequired={data.required}
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
              defaultValue={props.defaultValues?.[data?.name]}
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
              style={{
                textAlign: data.align,
                fontSize: data.fontSize,
                cursor: "pointer",
              }}
              onClick={() => {
                if (props.onClickCourse && props.idTimetable?.[data?.id]) {
                  props.onClickCourse(props.idTimetable?.[data?.id]);
                }
                if (props.onClickCourse && props.idTimetable?.[data?.name]) {
                  props.onClickCourse(props.idTimetable?.[data?.name]);
                }
              }}
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
                  props.defaultValues?.[data?.name]
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    if (data?.name === undefined) {
                      props.returnData[data?.id] = {
                        label: data?.id,
                      };
                      if (props.type === "timetable") {
                        Object.assign(props.returnData[data?.id], {
                          day: table[0][colIndex]?.data?.text,
                          start: data?.timeRangeStart ?? row[0]?.timeRangeStart,
                          end: data?.timeRangeEnd ?? row[0]?.timeRangeEnd,
                        });
                      }
                    } else {
                      props.returnData[data?.name] = {
                        label: data?.name,
                      };
                      if (props.type === "timetable") {
                        Object.assign(props.returnData[data?.name], {
                          day: table[0][colIndex]?.data?.text,
                          start: data?.timeRangeStart ?? row[0]?.timeRangeStart,
                          end: data?.timeRangeEnd ?? row[0]?.timeRangeEnd,
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
                filteredRepeat &&
                filteredRepeat.map((v: any, i: number) => {
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
                            <Cell
                              data={val}
                              dataRepeat={v}
                              dataRepeatIndex={i}
                              row={value}
                              table={props.blockData.data.table}
                              colIndex={ind}
                            />
                          </th>
                        ) : (
                          <td
                            key={`${i}-${ind}`}
                            colSpan={val?.colSpan}
                            rowSpan={val?.rowSpan}
                            style={{ fontSize: val?.fontSize }}
                          >
                            <Cell
                              data={val}
                              dataRepeat={v}
                              dataRepeatIndex={i}
                              row={value}
                              table={props.blockData.data.table}
                              colIndex={ind}
                            />
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
                        <Cell
                          data={val}
                          row={value}
                          table={props.blockData.data.table}
                          colIndex={ind}
                        />
                      </th>
                    ) : (
                      <td
                        key={ind}
                        colSpan={val?.colSpan}
                        rowSpan={val?.rowSpan}
                        style={{ fontSize: val?.fontSize }}
                      >
                        <Cell
                          data={val}
                          row={value}
                          table={props.blockData.data.table}
                          colIndex={ind}
                        />
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
