import React from "react";
import Table from "../../components/table/Table";
import { TableDummy } from "../../dummyData/TableDummy.data";

type Props = {};

const Test = (props: Props) => {
  
  return (
    <div>
      <Table data={TableDummy} header={[{text:"id",key:"id",type:"index"}]} />
    </div>
  );
};

export default Test;
