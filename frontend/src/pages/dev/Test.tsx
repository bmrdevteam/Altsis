import React from "react";
import Table from "../../components/table/Table";
import { TableDummy } from "../../dummyData/TableDummy.data";

type Props = {};

const Test = (props: Props) => {
  return (
    <div>
      <Table
        data={TableDummy}
        header={[
          { text: "", key: "", type: "checkbox" ,width:"48px",align:"center"},
          { text: "id", key: "id", type: "index" ,width:"48px",align:"center"},
          { text: "the firsta", key: "boolean", type: "time" ,align:"right"},
          { text: "namefield", key: "userId", type: "string" },
          { text: "email?", key: "s", type: "string" },
        ]}
      />
    </div>
  );
};

export default Test;
