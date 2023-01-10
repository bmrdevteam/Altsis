/**
 * @file Mentoring Page
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

import { useNavigate } from "react-router-dom";
import style from "style/pages/enrollment.module.scss";

// components
import Table from "components/tableV2/Table";

type Props = { courseList: any[]; subjectLabelHeaderList: any[] };

const CoursesMentoring = (props: Props) => {
  const navigate = useNavigate();

  const subjectHeaderList = [
    {
      text: "수업명",
      key: "classTitle",
      type: "text",
      textAlign: "center",
      whiteSpace: "pre",
    },

    {
      text: "시간",
      key: "timeText",
      type: "string",
      textAlign: "center",
    },
    {
      text: "강의실",
      key: "classroom",
      type: "string",
      textAlign: "center",
    },

    {
      text: "학점",
      key: "point",
      type: "string",
      textAlign: "center",
    },
    {
      text: "수강/정원",
      key: "count_limit",
      type: "string",
      textAlign: "center",
      whiteSpace: "pre",
    },
    {
      text: "개설자",
      key: "userName",
      type: "string",
      textAlign: "center",
    },
    {
      text: "멘토",
      key: "mentorText",
      type: "string",
      textAlign: "center",
    },
    {
      text: "상태",
      key: "confirmed",
      width: "72px",
      textAlign: "center",
      type: "status",
      status: {
        false: { text: "미승인", color: "red" },
        true: { text: "승인됨", color: "green" },
      },
    },
    {
      text: "자세히",
      key: "detail",
      type: "button",
      onClick: (e: any) => {
        navigate(`/courses/mentoring/${e._id}`, {
          replace: true,
        });
      },
      width: "72px",
      textAlign: "center",
      btnStyle: {
        border: true,
        color: "black",
        padding: "4px",
        round: true,
      },
    },
  ];

  return (
    <div className={style.section}>
      <Table
        control
        type="object-array"
        data={props.courseList}
        header={[
          {
            text: "No",
            type: "text",
            key: "tableRowIndex",
            width: "48px",
            textAlign: "center",
            whiteSpace: "pre",
          },
          ...props.subjectLabelHeaderList,
          ...subjectHeaderList,
        ]}
      />
    </div>
  );
};

export default CoursesMentoring;
