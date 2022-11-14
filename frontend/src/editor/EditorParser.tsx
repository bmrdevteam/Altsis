import { isArray } from "lodash";
import { useEffect, useRef } from "react";
import ParsedBlock from "./parser/blocks/ParsedBlock";

type Props = {
  data: any;
  onChange?: (data: any) => void;
  auth: "edit" | "view";
  defaultValues?: any;
  defaultTimetable?: any;
};

const EditorParser = (props: Props) => {
  const returnData = useRef<any>({});
  console.log(props.defaultTimetable);
  

  return (
    <div
      onInput={() => {
        console.log(returnData.current);

        props.onChange && props.onChange(returnData.current);
      }}
    >
      {isArray(props?.data?.data) &&
        props?.data?.data?.map((value: any, index: number) => {
          return (
            <div key={index}>
              <ParsedBlock
                returnData={returnData.current}
                blockData={value}
                auth={props.auth}
                defaultTimetable={props.defaultTimetable}
                defaultValues={props.defaultValues}
              />
            </div>
          );
        })}
    </div>
  );
};

export default EditorParser;
