import { isArray } from "lodash";
import { useEffect, useRef } from "react";
import ParsedBlock from "./parser/blocks/ParsedBlock";

type Props = {
  data: any;
  onChange?: (data: any) => void;
  auth: "edit" | "view";
  defaultValues?: any;
};

const EditorParser = (props: Props) => {
  const returnData = useRef<any>({});

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
                defaultValues={props.defaultValues}
              />
            </div>
          );
        })}
    </div>
  );
};

export default EditorParser;
