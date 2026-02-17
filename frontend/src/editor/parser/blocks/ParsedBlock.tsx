import React from "react";
import DOMPurify from "dompurify";
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
            width: `${props.blockData.data?.width ?? 100}%`,
          }}
        >
          <div
            style={{
              width: "100%",
              fontSize: props.blockData.data?.fontSize,
              fontWeight: props.blockData.data?.fontWeight,
              fontFamily: props.blockData.data?.fontFamily,
              textAlign: props.blockData.data?.textAlign,
            }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(props.blockData.data?.text ?? ""),
            }}
          />
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
          style={{ width: `${props.blockData.data?.width ?? 100}%` }}
        >
          <div className={style.line}></div>
        </div>
      );
    case "image":
      return props.blockData.data?.src ? (
        <div
          className={style.parsed_block}
          style={{
            width: `${props.blockData.data?.width ?? 100}%`,
          }}
        >
          <div style={{ width: "100%", textAlign: props.blockData.data?.alignment ?? "center" }}>
            <img
              src={props.blockData.data.src}
              alt={props.blockData.data?.alt ?? ""}
              style={{ maxWidth: "100%" }}
            />
            {props.blockData.data?.caption && (
              <div style={{ fontSize: "12px", color: "var(--accent-3)", marginTop: "4px" }}>
                {props.blockData.data.caption}
              </div>
            )}
          </div>
        </div>
      ) : null;
    case "input":
      return null;
    default:
      return (
        <div
          className={style.parsed_block}
          style={{ width: `${props.blockData.data?.width ?? 100}%` }}
        >
          <div style={{ width: "100%" }}>
            {props.blockData.data?.text ?? ""}
          </div>
        </div>
      );
  }
};

export default ParsedBlock;
