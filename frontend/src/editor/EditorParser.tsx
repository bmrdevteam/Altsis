import React, { useEffect, useState } from "react";
import useDatabase from "../hooks/useDatabase";
import ParsedBlock from "./parser/blocks/ParsedBlock";

type Props = {
  id: string;
};

const EditorParser = (props: Props) => {
  const database = useDatabase();
  const [data, setData] = useState<any>();

  async function getEditorData() {
    const { form: result } = await database.R({
      location: `forms/${props.id}`,
    });
    return result;
  }
  useEffect(() => {
    getEditorData().then((res) => {
      setData(res);
      console.log(res);
    });
  }, []);

  return (
    <div>
      {data?.data?.map((value: any, index: number) => {
        return (
          <div key={index}>
            <ParsedBlock blockData={value}/>
          </div>
        );
      })}
    </div>
  );
};

export default EditorParser;
