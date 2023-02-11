/**
 * @file Courses Pid Page
 *
 * more info on selected courses
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
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

// tab pages
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import Svg from "assets/svg/Svg";

import Send from "../../../notifications/popup/Send";
import EnrollBulkPopup from "./EnrollBulkPopup";

import _ from "lodash";

import ViewPopup from "../ViewPopup";

import { checkPermission } from "functions/functions";
import Navbar from "layout/navbar/Navbar";
import Loading from "components/loading/Loading";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentSeason } = useAuth();
  const { SyllabusApi, SeasonApi, EnrollmentApi } = useApi();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [courseData, setCourseData] = useState<any>();
  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);

  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);
  const [fieldEvaluationList, setFieldEvaluationList] = useState<any[]>([]);
  const [permissionEvaluation, setPermissionEvaluation] =
    useState<boolean>(false);

  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);
  const [enrollBulkPopupActive, setEnrollBulkPopupActive] =
    useState<boolean>(false);

  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [confirmedStatus, setConfirmedStatus] =
    useState<string>("notConfirmed");

  const [mentorIdx, setMentorIdx] = useState<number>(-1);
  const [mentorConfirmed, setMentorConfirmed] = useState<boolean>();

  const [isEnrollmentListLoading, setIsEnrollmentListLoading] =
    useState<boolean>(false);
  const [enrollmentList, setEnrollmentList] = useState<any[]>([]);
  const enrollmentListRef = useRef<any[]>([]);

  const [sendNotificationPopupActive, setSendNotificationPopupActive] =
    useState<boolean>(false);

  const [isChecked, setIsChecked] = useState<boolean>(false);

  useEffect(() => {
    if (courseData) {
      // is this syllabus fully confirmed?
      for (let teacher of courseData?.teachers) {
        if (!teacher.confirmed) {
          setConfirmed(false);
          break;
        }
      }

      const confirmedCnt = _.filter(courseData?.teachers, {
        confirmed: true,
      }).length;
      setConfirmedStatus(
        confirmedCnt === 0
          ? "notConfirmed"
          : confirmedCnt === courseData?.teachers.length
          ? "fullyConfirmed"
          : "semiConfirmed"
      );

      // Is this user is mentor of this syllabus?
      const mentorIdx = _.findIndex(courseData?.teachers, {
        userId: currentUser?.userId,
      });
      if (mentorIdx === -1) {
        alert("잘못된 접근입니다.");
        navigate("/courses");
      } else {
        setMentorIdx(mentorIdx);
        setMentorConfirmed(courseData.teachers[mentorIdx].confirmed);
      }
    }

    return () => {};
  }, [courseData]);

  useEffect(() => {
    if (isEnrollmentListLoading) {
      EnrollmentApi.REnrollmentWithEvaluations({
        syllabus: courseData?._id,
      }).then((res: any) => {
        setEnrollmentList(
          res.map((enrollment: any) => {
            return { ...enrollment, isModified: false };
          })
        );
        enrollmentListRef.current = [];
        setIsEnrollmentListLoading(false);
      });
    }

    return () => {};
  }, [isEnrollmentListLoading]);

  useEffect(() => {
    if (isLoading) {
      SyllabusApi.RSyllabus(pid)
        .then((result) => {
          if (
            result.season !== currentSeason?._id ||
            !_.find(result.teachers, { userId: currentUser.userId })
          )
            navigate("/courses#담당%20수업", { replace: true });

          setCourseData(result);
          EnrollmentApi.REnrollmentWithEvaluations({
            syllabus: result._id,
          }).then((res: any) => {
            setEnrollmentList(
              res.map((enrollment: any) => {
                return { ...enrollment, isModified: false };
              })
            );
            enrollmentListRef.current = [];

            SeasonApi.RSeason(result.season).then((res: any) => {
              let _formEvaluationHeader: any[] = [];

              if (
                checkPermission(
                  res.permissionEvaluation,
                  currentUser.userId,
                  "teacher"
                )
              ) {
                setPermissionEvaluation(true);
                res.formEvaluation.forEach((val: any) => {
                  const text = val.label;
                  const key = "evaluation." + text;

                  if (val.auth.edit.teacher) {
                    fieldEvaluationList.push({
                      text,
                      key,
                    });
                    if (val.type === "input-number") {
                      _formEvaluationHeader.push({
                        text,
                        key,
                        type: "input-number",
                        whiteSpace: "pre",
                      });
                    } else if (val.type === "select") {
                      _formEvaluationHeader.push({
                        text,
                        key,
                        type: "select",
                        whiteSpace: "pre",
                        option: val.options,
                      });
                    } else {
                      _formEvaluationHeader.push({
                        text,
                        key,
                        type: "input",
                        whiteSpace: "pre",
                      });
                    }
                  } else if (val.auth.view.student) {
                    _formEvaluationHeader.push({
                      text,
                      key,
                      type: "text",
                      whiteSpace: "pre",
                    });
                  }
                });
              } else {
                res.formEvaluation.forEach((val: any) => {
                  _formEvaluationHeader.push({
                    text: val.label,
                    key: "evaluation." + val.label,
                    type: "text",
                    whiteSpace: "pre",
                  });
                });
              }
              setFieldEvaluationList(fieldEvaluationList);
              setFormEvaluationHeader(_formEvaluationHeader);
              setIsLoading(false);
            });
          });
        })
        .catch((err) => {
          alert(err.response.data.message);
          navigate("/courses");
        });
    }

    return () => {};
  }, [isLoading]);

  return !isLoading && !isEnrollmentListLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 500,
            marginBottom: "18px",
            display: "flex",
            color: "var(--accent-1)",

            justifyContent: "space-between",
          }}
        >
          <div style={{ wordBreak: "keep-all" }} title="목록으로 이동">
            <span>&nbsp;/&nbsp;</span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/courses#담당%20수업", { replace: true });
              }}
            >
              {`담당 수업 목록 / ${pid}`}
            </span>
          </div>

          {courseData.user === currentUser._id && (
            <div
              className={style.icon}
              onClick={(e: any) => {
                navigate(`/courses/created/${courseData._id}`, {
                  replace: true,
                });
              }}
              style={{ display: "flex", gap: "4px", alignItems: "center" }}
              title="강의계획서 상세 페이지로 이동"
            >
              <Svg type="linkExternal" width="16px" height="16px" />
            </div>
          )}
        </div>

        <div className={style.title}>{courseData?.classTitle}</div>
        <div className={style.categories_container}>
          <div className={style.categories}>
            <div
              className={style.category}
              onClick={() => {
                setViewPopupActive(true);
              }}
            >
              강의계획서 조회
            </div>
            <div
              className={style.category}
              onClick={() => {
                setConfirmStatusPopupActive(true);
              }}
            >
              상태:{" "}
              {confirmedStatus === "fullyConfirmed"
                ? "승인됨"
                : confirmedStatus === "notConfirmed"
                ? "미승인"
                : "승인중"}
            </div>
          </div>
        </div>
        <Divider />

        <div style={{ height: "24px" }}></div>

        <>
          <div style={{ display: "flex" }}>
            <div
              style={{
                flex: "auto",
                marginLeft: "12px",
                display: "flex",
                gap: "12px",
              }}
            >
              <div className={style.title}>수강생 목록 및 평가</div>
            </div>
            <div
              style={{
                flex: "auto",
                marginRight: "24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                alignItems: "center",
              }}
            >
              {!isChecked ? (
                <div
                  className={style.icon}
                  onClick={(e: any) => {
                    if (!confirmed) {
                      alert("수업이 승인되지 않아 학생을 초대할 수 없습니다.");
                    } else {
                      setEnrollBulkPopupActive(true);
                    }
                  }}
                  style={{ display: "flex", gap: "4px", alignItems: "center" }}
                >
                  <Svg type="user_check" width="24px" height="24px" />
                  초대
                </div>
              ) : (
                <>
                  <div
                    className={style.icon}
                    onClick={(e: any) => {
                      EnrollmentApi.DEnrollments(
                        _.filter(enrollmentListRef.current, {
                          tableRowChecked: true,
                        }).map((e: any) => e._id)
                      ).then(() => {
                        alert("success");
                        setIsLoading(true);
                        setIsChecked(false);
                      });
                    }}
                    style={{
                      display: "flex",
                      gap: "4px",
                      alignItems: "center",
                    }}
                  >
                    <Svg type="user_check" width="24px" height="24px" />
                    초대 취소
                  </div>
                  <div
                    className={style.icon}
                    onClick={(e: any) => {
                      setSendNotificationPopupActive(true);
                    }}
                    style={{ display: "flex", gap: "4px" }}
                  >
                    <Svg type="send" width="20px" height="20px" />
                    알림
                  </div>
                </>
              )}
            </div>
          </div>
          {permissionEvaluation ? (
            <Table
              type="object-array"
              data={enrollmentList || []}
              onChange={(e: any) => {
                setTimeout(() => {
                  enrollmentListRef.current = e;
                  setIsChecked(
                    _.find(e, {
                      tableRowChecked: true,
                    })
                  );
                }, 50);
              }}
              header={[
                {
                  text: "checkbox",
                  key: "checkbox",
                  type: "checkbox",
                  width: "48px",
                },

                {
                  text: "학년",
                  key: "studentGrade",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
                },
                {
                  text: "ID",
                  key: "studentId",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
                },
                {
                  text: "이름",
                  key: "studentName",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
                },
                ...formEvaluationHeader,
                {
                  text: "저장",
                  key: "isModified",
                  width: "72px",
                  textAlign: "center",
                  type: "status",
                  status: {
                    false: { text: "저장", color: "gray" },
                    true: {
                      text: "저장",
                      color: "red",
                      onClick: (e) => {
                        const evaluation: any = {};
                        for (let obj of fieldEvaluationList) {
                          evaluation[obj.text] = e[obj.key];
                        }
                        EnrollmentApi.UEvaluation({
                          enrollment: e._id,
                          by: "mentor",
                          data: evaluation,
                        })
                          .then((res: any) => {
                            console.log("res.evaluation: ", res.evaluation);
                            alert("저장되었습니다");
                            if (enrollmentListRef.current.length !== 0) {
                              enrollmentListRef.current[
                                e.tableRowIndex - 1
                              ].isModified = false;
                              setEnrollmentList([...enrollmentListRef.current]);
                            }
                          })
                          .catch((err: any) => console.log(err));
                      },
                    },
                  },
                },
              ]}
            />
          ) : (
            <Table
              type="object-array"
              data={enrollmentList || []}
              header={[
                {
                  text: "No",
                  type: "text",
                  key: "tableRowIndex",
                  width: "48px",
                  textAlign: "center",
                  whiteSpace: "pre",
                },

                {
                  text: "학년",
                  key: "studentGrade",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
                  width: "120px",
                },
                {
                  text: "ID",
                  key: "studentId",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
                },
                {
                  text: "이름",
                  key: "studentName",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
                },
                ...formEvaluationHeader,
              ]}
            />
          )}
        </>

        {confirmStatusPopupActive && (
          <Popup
            setState={setConfirmStatusPopupActive}
            title="승인 상태"
            closeBtn
          >
            <Table
              type="object-array"
              data={courseData?.teachers}
              header={[
                {
                  text: "No",
                  type: "text",
                  key: "tableRowIndex",
                  width: "48px",
                  textAlign: "center",
                  whiteSpace: "pre",
                },
                {
                  text: "멘토 ID",
                  key: "userId",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
                },
                {
                  text: "멘토 이름",
                  key: "userName",
                  type: "text",
                  textAlign: "center",
                  whiteSpace: "pre",
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
                            .then(() => {
                              alert("confirmed");
                              setIsLoading(true);
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
                          if (enrollmentList && enrollmentList.length !== 0)
                            alert(
                              "수강신청한 학생이 있으면 승인을 취소할 수 없습니다."
                            );
                          else {
                            SyllabusApi.UnconfirmSyllabus(courseData?._id)
                              .then((res) => {
                                alert("unconfirmed");
                                setIsLoading(true);
                              })
                              .catch((err) => {
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
        {sendNotificationPopupActive && (
          <Send
            setState={setSendNotificationPopupActive}
            receiverSelectedList={_.filter(enrollmentListRef.current, {
              tableRowChecked: true,
            }).map((e: any) => {
              return {
                user: e.student,
                userId: e.studentId,
                userName: e.studentName,
              };
            })}
            category={courseData?.classTitle}
            receiverList={enrollmentListRef.current.map((e) => {
              return {
                user: e.student,
                userId: e.studentId,
                userName: e.studentName,
              };
            })}
            receiverType={"enrollment"}
          />
        )}
        {enrollBulkPopupActive && (
          <EnrollBulkPopup
            setPopupActive={setEnrollBulkPopupActive}
            courseData={courseData}
            setIsEnrollmentListLoading={setIsEnrollmentListLoading}
          />
        )}
        {viewPopupActive && pid && (
          <ViewPopup
            course={pid}
            setPopupActive={setViewPopupActive}
            hideStudentList={true}
            byMentor={true}
          />
        )}
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default CoursePid;
