/**
 * @file Created Course List Page
 * @page 수업 - 개설 수업(탭)
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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import style from "style/pages/enrollment.module.scss";
// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

type Props = {
  courseList: any[];
  subjectLabelHeaderList: any[];
};

const CoursesMyList = (props: Props) => {
  const navigate = useNavigate();

  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);
  const [courseData, setCourseData] = useState<any>();

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
      text: "멘토",
      key: "mentorText",
      type: "string",
      textAlign: "center",
    },
    {
      text: "상태",
      key: "confirmedStatus",
      width: "72px",
      textAlign: "center",
      type: "status",
      status: {
        notConfirmed: {
          text: "미승인",
          color: "red",
        },
        fullyConfirmed: {
          text: "승인됨",
          color: "green",
        },
        semiConfirmed: {
          text: "승인중",
          color: "purple",
          onClick: (e: any) => {
            setCourseData(props.courseList[e.tableRowIndex - 1]);
            setConfirmStatusPopupActive(true);
          },
        },
      },
    },
    {
      text: "자세히",
      key: "detail",
      type: "button",
      onClick: (e: any) => {
        navigate(`/courses/created/${e._id}`, {
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
    <>
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
      {confirmStatusPopupActive && (
        <Popup
          setState={setConfirmStatusPopupActive}
          title="승인 상태"
          closeBtn
        >
          <Table
            type="object-array"
            data={courseData?.teachers || []}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "멘토 ID",
                key: "userId",
                type: "text",
                textAlign: "center",
              },
              {
                text: "멘토 이름",
                key: "userName",
                type: "text",
                textAlign: "center",
              },

              {
                text: "상태",
                key: "confirmed",
                width: "120px",
                textAlign: "center",
                type: "status",
                status: {
                  false: {
                    text: "미승인",
                    color: "red",
                  },
                  true: {
                    text: "승인됨",
                    color: "green",
                  },
                },
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
};

export default CoursesMyList;
