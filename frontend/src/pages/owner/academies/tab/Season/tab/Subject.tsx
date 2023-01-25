/**
 * @file Season Page Tab Item - Subjects
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
import { useState, useEffect } from "react";
import style from "style/pages/admin/schools.module.scss";

// components
import Table from "components/tableV2/Table";

type Props = {
  seasonData: any;
};

const Subjects = (props: Props) => {
  /* subject data header & object list */
  const [subjectDataHeader, setSubjectDataHeader] = useState<any>([]);
  const [subjectObjectList, setSubjectObjectList] = useState<any[]>([]);

  useEffect(() => {
    const subjectLabelList = props.seasonData.subjects?.label || [];
    const subjectDataList = props.seasonData.subjects?.data || [];

    // updateSubjectDataHeader
    const _subjectDataHeader = [];
    for (let j = 0; j < subjectLabelList.length; j++) {
      _subjectDataHeader.push({
        text: subjectLabelList[j],
        key: subjectLabelList[j],
        type: "string",
      });
    }
    setSubjectDataHeader(_subjectDataHeader);

    // parse data
    setSubjectObjectList(
      subjectDataList.map((data: any) =>
        subjectLabelList.reduce(
          (ac: any[], a: string, idx: number) => ({ ...ac, [a]: data[idx] }),
          {}
        )
      )
    );

    return () => {};
  }, []);

  return (
    <>
      <div className={style.popup}>
        <div style={{ marginTop: "24px" }} />
        <Table
          type="object-array"
          data={subjectObjectList || []}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            ...subjectDataHeader,
          ]}
        />
      </div>
    </>
  );
};

export default Subjects;
