import { isArray } from "lodash";
import ParsedBlock from "./parser/blocks/ParsedBlock";

type Props = {
  data: any;
  onChange?: (data: any) => {};
};

const EditorParser = (props: Props) => {
  console.log(props.data);

  return (
    <div>
      {isArray(props?.data?.data) &&
        props?.data?.data?.map((value: any, index: number) => {
          return (
            <div key={index}>
              <ParsedBlock blockData={value} onChange={props.onChange} />
            </div>
          );
        })}
    </div>
  );
};

export default EditorParser;
