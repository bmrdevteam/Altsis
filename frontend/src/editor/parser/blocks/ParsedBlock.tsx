import React from "react";
import style from "../../editor.module.scss";
import ParsedTableBlock from "./ParsedTableBlock";
type Props = {
  blockData: any;
  auth: "edit" | "view";
  returnData: any;
  defaultValues?: any;
  defaultTimetable?: any;
  idTimetable?: any;
  onClickCourse?: any;
  dbData?: any;
  strictMode?: boolean;
  type: "timetable" | "archive" | "syllabus";
};

const ParsedBlock = (props: Props) => {
  switch (props.blockData.type) {
    case "paragraph":
      return (
        <div
          className={style.parsed_block}
          style={{
            width: `${props.blockData.data.width ?? 100}%`,
            fontSize: props.blockData.data.fontSize,
            fontWeight: props.blockData.data.fontWeight,
            textAlign: props.blockData.data.textAlign,
          }}
        >
          {props.blockData.data.text}
        </div>
      );
    case "table":
      return (
        <ParsedTableBlock
          blockData={props.blockData}
          auth={props.auth}
          type={props.type}
          defaultValues={props.defaultValues}
          returnData={props.returnData}
          defaultTimetable={props.defaultTimetable}
          idTimetable={props.idTimetable}
          onClickCourse={props.onClickCourse}
          dbData={props.dbData}
          strictMode={props.strictMode}
        />
      );
    case "divider":
      return (
        <div
          className={`${style.parsed_block} ${style.line}`}
          style={{ width: `${props.blockData.data.width ?? 100}%` }}
        >
          <div className={style.line}></div>
        </div>
      );
    default:
      return (
        <div
          className={style.parsed_block}
          style={{ width: `${props.blockData.data.width ?? 100}%` }}
        >
          {props.blockData.data.text}
        </div>
      );
  }
};

export default ParsedBlock;
