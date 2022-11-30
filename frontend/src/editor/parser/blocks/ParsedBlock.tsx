import React from "react";
import style from "../../editor.module.scss";
import ParsedDataTableBlock from "./ParsedDataTableBlock";
import ParsedTableBlock from "./ParsedTableBlock";
type Props = {
  blockData: any;
  auth: "edit" | "view";
  returnData: any;
  defaultValues?: any;
  defaultTimetable?: any;
  dbData?: any;
};

const ParsedBlock = (props: Props) => {
  switch (props.blockData.type) {
    case "paragraph":
      return (
        <div
          className={style.parsed_block}
          style={{
            fontSize: props.blockData.data.fontSize,
            fontWeight: props.blockData.data.fontWeight,
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
          defaultValues={props.defaultValues}
          returnData={props.returnData}
          defaultTimetable={props.defaultTimetable}
          dbData={props.dbData}
        />
      );
    case "dataTable":
      return (
        <ParsedDataTableBlock blockData={props.blockData} auth={props.auth} />
      );
    default:
      return (
        <div className={style.parsed_block}>{props.blockData.data.text}</div>
      );
  }
};

export default ParsedBlock;
