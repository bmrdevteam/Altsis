/**
 * @file User Add Bulk Popup Tab Item - Select school
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

import React from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Table from "components/tableV2/Table";

type Props = {
  schoolListRef: React.MutableRefObject<any[]>;
};

function SelectSchool(props: Props) {
  return (
    <div className={style.popup}>
      <div className={style.description} style={{ marginTop: "24px" }}>
        {"등록할 학교를 선택해주세요"}
      </div>

      <div style={{ marginTop: "24px" }}>
        <Table
          type="object-array"
          data={props.schoolListRef.current}
          onChange={(value: any[]) => {
            props.schoolListRef.current = value;
          }}
          header={[
            {
              text: "선택",
              key: "checkbox",
              type: "checkbox",
              width: "48px",
            },
            {
              text: "학교 이름",
              key: "schoolName",
              type: "text",
              textAlign: "center",
            },
            {
              text: "학교 ID",
              key: "schoolId",
              type: "text",
              textAlign: "center",
            },
          ]}
        />
      </div>
    </div>
  );
}

export default SelectSchool;
