import { isArray } from "lodash";
import { useRef } from "react";
import ParsedBlock from "./parser/blocks/ParsedBlock";

type Props = {
  data: any;
  onChange?: (data: any) => {};
  auth: "edit" | "view";
};

const EditorParser = (props: Props) => {
  console.log(props.data);
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
                onChange={props.onChange}
              />
            </div>
          );
        })}
    </div>
  );
};

export default EditorParser;
