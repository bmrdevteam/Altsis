/**
 * @file Schools Pid Page Tab Item - Subject
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */
import React, { useEffect, useState } from "react";
import Tree from "components/tree/Tree";
import Table from "components/table/Table";

type Props = {
  school: any;
};

const Subject = (props: Props) => {
  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        type="string-array"
        data={props.school?.subjects.data}
        header={[
          {
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          {
            text: "교과",
            key: 0,
            type: "string",
          },
          {
            text: "과목",
            key: 1,
            type: "string",
          },
        ]}
      />
    </div>
  );
};

export default Subject;
