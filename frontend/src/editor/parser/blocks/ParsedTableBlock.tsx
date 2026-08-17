import { useAuth } from "contexts/authContext";
import _, { isArray, isNumber } from "lodash";
import React from "react";
import style from "../../editor.module.scss";
import { matchesDataFilter } from "../../functions/dataConnFilters";
import { isArchiveFileValue } from "../../functions/archiveImage";
import ArchiveImage from "./ArchiveImage";

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
  strictMode?: boolean;
};

/** 저장 키는 셀 id. 예전 name 키 값은 하위 호환으로만 읽음 */
function readByCellKey(store: any, data: { id?: string; name?: string }) {
  if (!store || !data) return undefined;
  if (data.id != null && store[data.id] !== undefined) return store[data.id];
  if (data.name != null && store[data.name] !== undefined) return store[data.name];
  return undefined;
}

function writeByCellId(
  store: any,
  data: { id?: string; name?: string },
  value: any
) {
  if (!store || !data?.id) return;
  store[data.id] = value;
  // 예전 name 키에 남아 있던 값과 혼선되지 않도록 정리
  if (data.name && data.name !== data.id && data.name in store) {
    delete store[data.name];
  }
}

function deleteByCellId(store: any, data: { id?: string; name?: string }) {
  if (!store || !data) return;
  if (data.id != null) delete store[data.id];
  if (data.name && data.name !== data.id) delete store[data.name];
}

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
      _.forEach(props.blockData.data.dataCellFilter, (filter: any) => {
        // 조건에 맞지 않으면 해당 cell 값을 비움 (기존: 실패 시 cell 수집)
        if (!matchesDataFilter(item, filter)) {
          if (filter.cell) {
            cellName = [...cellName, filter.cell];
          }
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
     // AND 필터: 모든 조건이 맞아야 통과
    if (props.blockData.data.dataFilter?.length > 0) {
      const failed = props.blockData.data.dataFilter.some(
        (filter: any) => !matchesDataFilter(v, filter)
      );
      if (failed) {
        return false;
      }
    }
    // OR 필터: 하나라도 맞으면 통과 (전부 실패 시 제외)
    if (props.blockData.data.dataOrFilter?.length > 0) {
      const anyMatch = props.blockData.data.dataOrFilter.some((filter: any) =>
        matchesDataFilter(v, filter)
      );
      if (!anyMatch) {
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

  // max
  if (
    props.blockData.data.dataRepeat?.max !== undefined && // max 속성이 정의되어 있는지 확인
    isNumber(props.blockData.data.dataRepeat.max) && // max가 숫자인지 확인
    props.blockData.data.dataRepeat.max > 0 // max가 음수가 아닌지 확인 (선택 사항)
  ) {
    filteredRepeat = filteredRepeat.slice(
      0,
      props.blockData.data.dataRepeat.max
    );
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
            {
            data?.dataText?.map((dataTextElement: any, index: number) => {
              if (typeof dataTextElement === "object") {
                if (dataTextElement.tag === "DATA") {
                  const locationArr = dataTextElement.location.split("//");
                  if (!dataRepeat) {
                    const result = _.get(props.dbData, locationArr, "");
                    if (isArchiveFileValue(result)) {
                      return (
                        <ArchiveImage
                          key={index}
                          file={result}
                          location={dataTextElement.location}
                          dbData={props.dbData}
                        />
                      );
                    }
                    return `${_.get(props.dbData, locationArr, "")}`;
                  } else {
                    const repeatResult = dataRepeat?.[locationArr[locationArr.length - 1]];
                    if (isArchiveFileValue(repeatResult)) {
                      return (
                        <ArchiveImage
                          key={index}
                          file={repeatResult}
                          location={dataTextElement.location}
                          dbData={props.dbData}
                        />
                      );
                    }
                    return repeatResult;
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
      case "input": {
        const inputValue = readByCellKey(props.returnData, data) ?? "";
        return props.auth === "edit" ? (
          <div
            className={`${style.cell} ${style.input}`}
            style={{ textAlign: data.align }}
            placeholder={data.placeholder ?? "입력"}
            contentEditable
            onClick={() => {}}
            defaultValue={inputValue}
            data-inputrequired={data.required}
            suppressContentEditableWarning
            onInput={(e) => {
              writeByCellId(
                props.returnData,
                data,
                e.currentTarget.textContent
              );
            }}
          >
            {inputValue}
          </div>
        ) : (
          <div>
            <div className={style.cell} style={{ textAlign: data.align }}>
              {readByCellKey(props.defaultValues, data)}
            </div>
          </div>
        );
      }
      case "select":
        return props.auth === "edit" ? (
          <div
            className={`${style.cell} ${style.select}`}
            placeholder={data.placeholder ?? "입력"}
          >
            <select
              style={{ textAlign: data.align, fontSize: data.fontSize }}
              onChange={(e) => {
                writeByCellId(props.returnData, data, e.target.value);
              }}
              defaultValue={readByCellKey(props.defaultValues, data)}
            >
              {(data.options ?? []).map((val: any) => {
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
                writeByCellId(props.returnData, data, e.target.value);
              }}
              defaultValue={readByCellKey(props.defaultValues, data)}
              disabled={true}
            >
              {(data.options ?? []).map((val: any) => {
                return (
                  <option key={val.id} value={val.value}>
                    {val.text}
                  </option>
                );
              })}
            </select>
          </div>
        );
      case "checkbox": {
        const timetableLabel = readByCellKey(props.defaultTimetable, data);
        if (timetableLabel) {
          return (
            <div
              className={style.cell}
              style={{
                textAlign: data.align,
                fontSize: data.fontSize,
                cursor: "pointer",
              }}
              onClick={() => {
                const courseId = readByCellKey(props.idTimetable, data);
                if (props.onClickCourse && courseId) {
                  props.onClickCourse(courseId);
                }
              }}
            >
              {timetableLabel}
            </div>
          );
        }
        const checkedValue = readByCellKey(props.defaultValues, data);
        return (
          <div
            className={style.cell}
            style={{ textAlign: data.align, fontSize: data.fontSize }}
          >
            {props.auth === "edit" && (
              <input
                type="checkbox"
                defaultChecked={checkedValue === true || !!checkedValue}
                disabled={props.strictMode}
                onChange={(e) => {
                  if (e.target.checked) {
                    const payload: Record<string, any> = {
                      label: data?.name?.trim() || data?.id,
                    };
                    if (props.type === "timetable") {
                      Object.assign(payload, {
                        day: table[0][colIndex]?.data?.text,
                        start: data?.timeRangeStart ?? row[0]?.timeRangeStart,
                        end: data?.timeRangeEnd ?? row[0]?.timeRangeEnd,
                      });
                    }
                    writeByCellId(props.returnData, data, payload);
                  } else {
                    deleteByCellId(props.returnData, data);
                  }
                }}
              />
            )}
          </div>
        );
      }
      case "timeRange":
        return (
          <div className={style.cell} style={{ textAlign: data.align }}>
            {data.timeRangeDisplayText || `${data.timeRangeStart || "00:00"} ~ ${data.timeRangeEnd || "00:00"}`}
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
        style={{
          fontSize: props.blockData.data?.fontSize,
          fontFamily: props.blockData.data?.fontFamily,
          fontWeight: props.blockData.data?.fontWeight,
          borderWidth: props.blockData.data?.borderWidth,
          borderColor: props.blockData.data?.borderColor,
          borderStyle: props.blockData.data?.borderStyle,
          borderRadius: props.blockData.data?.borderRadius,
          backgroundColor: props.blockData.data?.backgroundColor,
        }}
      >
      <SetColumn />
      <tbody>
      {props.blockData.data.table.map((value: any[], index: number) => {
      const repeatIndex = props.blockData.data.dataRepeat?.index;
      const repeatBy = props.blockData.data.dataRepeat?.by;
      if (repeatBy && typeof repeatIndex === "number" && repeatIndex === index) {
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
        style={{
        fontSize: val?.fontSize,
        fontFamily: val?.fontFamily,
        fontWeight: val?.fontWeight,
        borderWidth: val?.borderWidth,
        borderColor: val?.borderColor,
        borderStyle: val?.borderStyle,
        borderRadius: val?.borderRadius,
        backgroundColor: val?.backgroundColor,
        backgroundImage: val?.backgroundImage ? `url(${val.backgroundImage})` : undefined,
        backgroundSize: val?.backgroundImage ? (val?.backgroundSize || "cover") : undefined,
        backgroundPosition: val?.backgroundImage ? (val?.backgroundPosition || "center") : undefined,
        }}
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
        style={{
        fontSize: val?.fontSize,
        fontFamily: val?.fontFamily,
        fontWeight: val?.fontWeight,
        borderWidth: val?.borderWidth,
        borderColor: val?.borderColor,
        borderStyle: val?.borderStyle,
        borderRadius: val?.borderRadius,
        backgroundColor: val?.backgroundColor,
        backgroundImage: val?.backgroundImage ? `url(${val.backgroundImage})` : undefined,
        backgroundSize: val?.backgroundImage ? (val?.backgroundSize || "cover") : undefined,
        backgroundPosition: val?.backgroundImage ? (val?.backgroundPosition || "center") : undefined,
        }}
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
      style={{
        fontSize: val?.fontSize,
        fontFamily: val?.fontFamily,
        fontWeight: val?.fontWeight,
        borderWidth: val?.borderWidth,
        borderColor: val?.borderColor,
        borderStyle: val?.borderStyle,
        borderRadius: val?.borderRadius,
        backgroundColor: val?.backgroundColor,
        backgroundImage: val?.backgroundImage ? `url(${val.backgroundImage})` : undefined,
        backgroundSize: val?.backgroundImage ? (val?.backgroundSize || "cover") : undefined,
        backgroundPosition: val?.backgroundImage ? (val?.backgroundPosition || "center") : undefined,
      }}
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
      style={{
        fontSize: val?.fontSize,
        fontFamily: val?.fontFamily,
        fontWeight: val?.fontWeight,
        borderWidth: val?.borderWidth,
        borderColor: val?.borderColor,
        borderStyle: val?.borderStyle,
        borderRadius: val?.borderRadius,
        backgroundColor: val?.backgroundColor,
        backgroundImage: val?.backgroundImage ? `url(${val.backgroundImage})` : undefined,
        backgroundSize: val?.backgroundImage ? (val?.backgroundSize || "cover") : undefined,
        backgroundPosition: val?.backgroundImage ? (val?.backgroundPosition || "center") : undefined,
      }}
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
