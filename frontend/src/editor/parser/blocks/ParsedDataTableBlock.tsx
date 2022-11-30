import React, { useEffect, useState } from "react";
import useDatabase from "../../../hooks/useDatabase";
import style from "../../editor.module.scss";

type Props = { blockData: any; auth: "edit" | "view" };

function ParsedDataTableBlock(props: Props) {
  const database = useDatabase();

  const [data, setData] = useState<any[]>();

  async function getData() {
    const result = await database.R({
      location: "enrollments/list",
    });
    return result;
  }
  useEffect(() => {
    getData().then((res) => {
      setData(res.enrollments);
    });
  }, []);

  return (
    <div>
      <table className={style.table}>
        <thead>
          <tr>
            {props.blockData.data.dataTableHeaders.map(
              (value: any, index: number) => {
                return (
                  <th key={index} className={style.cell}>
                    {value}
                  </th>
                );
              }
            )}
          </tr>
        </thead>
        <tbody>
          {data?.map((value, index) => {
            return (
              <tr key={index}>
                {props.blockData.data.dataTableColumns?.map(
                  (v: any, i: number) => {
                    return (
                      <td key={i}>
                        {value[props.blockData.data.dataTableBody[i]]}
                      </td>
                    );
                  }
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ParsedDataTableBlock;
