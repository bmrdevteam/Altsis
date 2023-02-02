/**
 * @file Season Page Tab Item - Classroom
 *
 * @author jessie129j <jessie129j@gmail.com>
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

import style from "style/pages/admin/schools.module.scss";

// components
import Table from "components/tableV2/Table";

type Props = {
  seasonData: any;
};

const Classroom = (props: Props) => {
  return (
    <>
      <div className={style.popup}>
        <div style={{ marginTop: "24px" }} />

        <Table
          data={props.seasonData.classrooms || []}
          type="string-array"
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "강의실",
              key: "0",
              type: "text",
            },
          ]}
        />
      </div>
    </>
  );
};

export default Classroom;
