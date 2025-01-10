import { isArray } from "lodash";
import { useEffect, useRef } from "react";
import ParsedBlock from "./parser/blocks/ParsedBlock";
import style from "./editor.module.scss";

type Props = {
  data: any;
  onChange?: (data: any) => void;
  auth: "edit" | "view";
  type: "timetable" | "archive" | "syllabus";
  defaultValues?: any;
  defaultTimetable?: any;
  idTimetable?: any;
  onClickCourse?: any;
  dbData?: any;
};

const EditorParser = (props: Props) => {
  const returnData = useRef<any>({});
  returnData.current = props.defaultValues || {};

  return (
    <div
      className={style.editor_parser_container}
      onInput={() => {
        props.onChange && props.onChange(returnData.current);
      }}
    >
      {isArray(props?.data?.data) &&
        props?.data?.data?.map((value: any, index: number) => {
          return (
            <ParsedBlock
              type={props.type}
              key={index}
              returnData={returnData.current}
              blockData={value}
              auth={props.auth}
              dbData={props.dbData}
              defaultTimetable={props.defaultTimetable}
              idTimetable={props.idTimetable}
              onClickCourse={props.onClickCourse}
              defaultValues={props.defaultValues}
            />
          );
        })}
    </div>
  );
};

export default EditorParser;
