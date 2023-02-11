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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import style from "style/pages/enrollment.module.scss";
import useApi from "hooks/useApi";
import { useAuth } from "contexts/authContext";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

type Props = {
  courseList: any[];
  subjectLabelHeaderList: any[];
  updateCourses: any;
};

const CoursesMentoring = (props: Props) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);
  const [courseData, setCourseData] = useState<any>();
  const { SyllabusApi } = useApi();

  const subjectHeaderList = [
    {
      text: "수업명",
      key: "classTitle",
      type: "text",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "320px",
    },

    {
      text: "시간",
      key: "timeText",
      type: "string",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "120px",
    },
    {
      text: "강의실",
      key: "classroom",
      type: "string",
      textAlign: "center",
      whiteSpace: "pre",
      width: "80px",
    },

    {
      text: "학점",
      key: "point",
      type: "string",
      textAlign: "center",
      whiteSpace: "pre",
      width: "60px",
    },
    {
      text: "수강/정원",
      key: "count_limit",
      type: "string",
      textAlign: "center",
      whiteSpace: "pre",
      width: "80px",
    },
    {
      text: "개설자",
      key: "userName",
      type: "string",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "80px",
    },
    {
      text: "멘토",
      key: "mentorText",
      type: "string",
      textAlign: "center",
      wordBreak: "keep-all",
      width: "80px",
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
      text: "상태(new)",
      key: "confirmedStatus",
      width: "72px",
      textAlign: "center",
      type: "status",
      status: {
        notConfirmed: {
          text: "미승인",
          color: "red",
          onClick: (e: any) => {
            SyllabusApi.ConfirmSyllabus(e._id)
              .then((res) => {
                alert("confirmed");
                props.updateCourses();
              })
              .catch((err) => {
                alert("failed to confirm");
              });
          },
        },
        fullyConfirmed: {
          text: "승인됨",
          color: "green",
          onClick: (e: any) => {
            if (e.count_limit[0] !== "0")
              alert("수강신청한 학생이 있으면 승인을 취소할 수 없습니다.");
            else {
              SyllabusApi.UnconfirmSyllabus(e._id)
                .then((res) => {
                  alert("unconfirmed");
                  props.updateCourses();
                })
                .catch((x) => {
                  alert("failed to unconfirm");
                });
            }
          },
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
                    onClick: (e: any) => {
                      if (e._id === currentUser._id) {
                        SyllabusApi.ConfirmSyllabus(courseData?._id)
                          .then((res) => {
                            alert("confirmed");
                            props.updateCourses();
                            e.confirmed = true;
                          })
                          .catch((err) => {
                            alert("failed to confirm");
                          });
                      }
                    },
                  },
                  true: {
                    text: "승인됨",
                    color: "green",
                    onClick: (e: any) => {
                      if (e._id === currentUser._id) {
                        if (courseData?.count_limit[0] !== "0")
                          alert(
                            "수강신청한 학생이 있으면 승인을 취소할 수 없습니다."
                          );
                        else {
                          SyllabusApi.UnconfirmSyllabus(courseData?._id)
                            .then((res) => {
                              alert("unconfirmed");
                              props.updateCourses();
                              e.confirmed = false;
                            })
                            .catch((x) => {
                              alert("failed to unconfirm");
                            });
                        }
                      }
                    },
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

export default CoursesMentoring;
