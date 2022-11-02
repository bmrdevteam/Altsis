import Table from "components/table/Table";
import React, { useState } from "react";

type Props = {};

const Body = (props: Props) => {
  const [bodyData, setBodyData] = useState<any[]>();

  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        filter
        filterSearch
        data={bodyData}
        header={[{ key: "", text: "", type: "string" }]}
      />
    </div>
  );
};

export default Body;
