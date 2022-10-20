import { isArray, isObject } from "lodash";
import React, { useEffect, useState } from "react";
import useDatabase from "../../../hooks/useDatabase";

type Props = { blockData: any };

function ParsedDataTextBlock(props: Props) {
  const database = useDatabase();

  const [data, setData] = useState<any>();

  async function getData() {
    const result = await database.R({ location: `` });
    return result;
  }
  useEffect(() => {
    getData().then((res) => {
      setData(res);
    });
  }, []);

  const outputText = (): string | number => {
    if (isArray(data)) {
      return data[0];
    }
    if (isObject(data)) {
      return data[Object.keys(data)[0] as keyof typeof data];
    }
    return data;
  };

  return <div>{outputText()}</div>;
}

export default ParsedDataTextBlock;
