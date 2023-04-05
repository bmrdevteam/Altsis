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
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useApi from "hooks/useApi";
import { useAuth } from "contexts/authContext";
import style from "style/pages/courses/course.module.scss";

import Navbar from "layout/navbar/Navbar";

import _ from "lodash";
import EditorParser from "editor/EditorParser";
import Divider from "components/divider/Divider";

import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Loading from "components/loading/Loading";
import Svg from "assets/svg/Svg";

import { checkPermission } from "functions/functions";
import EnrollBulkPopup from "./EnrollBulkPopup";
import Send from "../../../notifications/popup/Send";

type Props = {};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentSeason, currentUser } = useAuth();
  const { SyllabusApi, SeasonApi, EnrollmentApi } = useApi();
  const navigate = useNavigate();

  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState<boolean>(true);
  const [syllabus, setSyllabus] = useState<any>();

  const [confirmedStatus, setConfirmedStatus] =
    useState<string>("notConfirmed");
  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [isEnrollmentsLoading, setIsEnrollmentsLoading] =
    useState<boolean>(false);
  const [enrollmentList, setEnrollmentList] = useState<any[]>([]);
  const enrollmentListRef = useRef<any[]>([]);
  const [isChecked, setIsChecked] = useState<boolean>(false);

  const [enrollBulkPopupActive, setEnrollBulkPopupActive] =
    useState<boolean>(false);
  const [sendNotificationPopupActive, setSendNotificationPopupActive] =
    useState<boolean>(false);

  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);
  const [fieldEvaluationList, setFieldEvaluationList] = useState<any[]>([]);
  const [permissionEvaluation, setPermissionEvaluation] =
    useState<boolean>(false);

  const categories = () => {
    return (
      <>
        {currentSeason?.subjects?.label && (
          <div className={style.category}>
            {_.join(currentSeason?.subjects.label, "/")}:{" "}
            {_.join(syllabus.subject, "/")}
          </div>
        )}
        <div className={style.category}>
          강의실: {syllabus.classroom || "없음"}
        </div>
        <div className={style.category}>
          시간:{" "}
          {_.join(
            syllabus?.time.map((timeBlock: any) => timeBlock.label),
            ", "
          )}
        </div>
        <div className={style.category}>학점: {syllabus.point}</div>
        <div
          className={style.category}
          key={`category-${enrollmentList.length}-limit`}
        >
          수강/정원: {enrollmentList.length}/{syllabus.limit}
        </div>

        <div className={style.category}>개설자: {syllabus.userName}</div>
        <div className={style.category}>
          멘토:{" "}
          {_.join(
            syllabus.teachers?.map((teacher: any) => teacher.userName),
            ", "
          )}
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
      </>
    );
  };

  useEffect(() => {
    if (isLoadingSyllabus) {
      SyllabusApi.RSyllabus(pid)
        .then((result) => {
          if (result.season !== currentSeason?._id) {
            navigate("/courses#담당%20수업", { replace: true });
          }

          setSyllabus(result);

          // is this syllabus fully confirmed?
          // Is this user is mentor of this syllabus?
          let confirmedCnt = 0;
          let isMentor = false;
          for (let teacher of result?.teachers) {
            if (teacher.confirmed) {
              confirmedCnt += 1;
            }
            if (teacher.userId === currentUser?.userId) {
              isMentor = true;
            }
          }
          setConfirmedStatus(
            confirmedCnt === 0
              ? "notConfirmed"
              : confirmedCnt === result?.teachers.length
              ? "fullyConfirmed"
              : "semiConfirmed"
          );
          if (!isMentor) {
            navigate("/courses#담당%20수업", { replace: true });
          }

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
          });
        })
        .then(() => {
          setIsLoadingSyllabus(false);
          setIsEnrollmentsLoading(true);
        })
        .catch((err) => {
          console.log(err);
          // alert(err.response.data.message);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoadingSyllabus]);

  useEffect(() => {
    if (isEnrollmentsLoading) {
      EnrollmentApi.REnrollmentWithEvaluations({
        syllabus: pid,
      }).then((res: any) => {
        setEnrollmentList(
          _.sortBy(
            res.map((enrollment: any) => {
              return { ...enrollment, isModified: false };
            }),
            ["grade", "studentName", "studentId"]
          )
        );
        enrollmentListRef.current = [];

        setIsEnrollmentsLoading(false);
      });
    }
    return () => {};
  }, [isEnrollmentsLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        {!isLoadingSyllabus ? (
          <div className={"syllabus-enrollments-wrapper"}>
            <div className={"syllabus"}>
              <div
                className={"syllabus-header"}
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

                {syllabus.user === currentUser._id && (
                  <div
                    className={style.icon}
                    onClick={(e: any) => {
                      navigate(`/courses/created/${syllabus._id}`, {
                        replace: true,
                      });
                    }}
                    style={{
                      display: "flex",
                      gap: "4px",
                      alignItems: "center",
                    }}
                    title="강의계획서 상세 페이지로 이동"
                  >
                    <Svg type="linkExternal" width="16px" height="16px" />
                  </div>
                )}
              </div>

              <div className={style.title}>{syllabus.classTitle}</div>
              <div className={style.categories_container}>
                <div className={style.categories}>{categories()}</div>
              </div>
              <Divider />
              <EditorParser
                type="syllabus"
                auth="view"
                defaultValues={syllabus.info}
                data={currentSeason?.formSyllabus}
              />
            </div>
            <div style={{ marginTop: "24px" }} className={"enrollments"}>
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
                        if (confirmedStatus !== "fullyConfirmed") {
                          alert(
                            "수업이 승인되지 않아 학생을 초대할 수 없습니다."
                          );
                        } else {
                          setEnrollBulkPopupActive(true);
                        }
                      }}
                      style={{
                        display: "flex",
                        gap: "4px",
                        alignItems: "center",
                      }}
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
                            alert(SUCCESS_MESSAGE);
                            setIsLoadingSyllabus(true);
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
                  data={!isEnrollmentsLoading ? enrollmentList : []}
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
                      text: "이름",
                      key: "studentName",
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
                                alert(SUCCESS_MESSAGE);
                                if (enrollmentListRef.current.length !== 0) {
                                  enrollmentListRef.current[
                                    e.tableRowIndex - 1
                                  ].isModified = false;
                                  setEnrollmentList([
                                    ...enrollmentListRef.current,
                                  ]);
                                }
                              })
                              .catch((err: any) =>
                                alert("failed to update evaluation")
                              );
                          },
                        },
                      },
                    },
                  ]}
                />
              ) : (
                <Table
                  type="object-array"
                  data={!isEnrollmentsLoading ? enrollmentList : []}
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
                      text: "이름",
                      key: "studentName",
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
                    ...formEvaluationHeader,
                  ]}
                />
              )}
            </div>
          </div>
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
      {confirmStatusPopupActive && (
        <Popup
          setState={setConfirmStatusPopupActive}
          title="승인 상태"
          closeBtn
        >
          <Table
            type="object-array"
            data={syllabus?.teachers}
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
                        SyllabusApi.ConfirmSyllabus(syllabus?._id)
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            setIsLoadingSyllabus(true);
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
                          SyllabusApi.UnconfirmSyllabus(syllabus?._id)
                            .then((res) => {
                              alert(SUCCESS_MESSAGE);
                              setIsLoadingSyllabus(true);
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
          category={syllabus?.classTitle}
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
          courseData={syllabus}
          setIsEnrollmentListLoading={setIsEnrollmentsLoading}
        />
      )}
    </>
  );
};

export default CoursePid;
