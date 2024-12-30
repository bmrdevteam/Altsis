/**
 * @file Enrolled Course View
 * @page 수강 수업 상세페이지
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
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "contexts/authContext";
// tab pages
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import _ from "lodash";

import Navbar from "layout/navbar/Navbar";
import Loading from "components/loading/Loading";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const CourseEnrollment = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentRegistration, currentSeason } = useAuth();
  const navigate = useNavigate();
  const { EnrollmentAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] =
    useState<boolean>(false);

  const [enrollmentData, setEnrollmentData] = useState<any>();

  const [courseData, setCourseData] = useState<any>();
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);
  const [fieldEvaluationList, setFieldEvaluationList] = useState<any[]>([]);

  const [enrollments, setEnrollments] = useState<any[]>();

  const categories = () => {
    return (
      <>
        <div className={style.category}>
          {_.join(currentSeason?.subjects?.label, "/")}:{" "}
          {_.join(enrollmentData?.subject, "/")}
        </div>{" "}
        <div className={style.category}>
          강의실: {enrollmentData?.classroom || "없음"}
        </div>
        <div className={style.category}>
          시간:{" "}
          {_.join(
            enrollmentData?.time?.map((timeBlock: any) => timeBlock.label),
            ", "
          )}
        </div>
        <div className={style.category}>학점: {enrollmentData?.point}</div>
        <div className={style.category}>수강정원: {enrollmentData?.limit}</div>
        <div className={style.category}>개설자: {enrollmentData?.userName}</div>
        <div className={style.category}>
        지도교사:{" "}
          {_.join(
            enrollmentData?.teachers?.map((teacher: any) => teacher.userName),
            ", "
          )}
        </div>
        <div
          className={style.category}
          onClick={() => {
            setConfirmStatusPopupActive(true);
          }}
        >
          상태: {confirmed ? "승인됨" : "미승인"}
        </div>
      </>
    );
  };

  const ClassInfo = () => {
    return (
      <EditorParser
        type="syllabus"
        auth="view"
        defaultValues={courseData?.info}
        data={currentSeason?.formSyllabus}
      />
    );
  };

  useEffect(() => {
    if (
      currentUser?._id &&
      currentRegistration?._id &&
      currentSeason?.formEvaluation
    ) {
      setIsLoading(true);
    }
    return () => {};
  }, [currentUser, currentRegistration, currentSeason]);

  useEffect(() => {
    if (isLoading && pid) {
      EnrollmentAPI.REnrollment({ params: { _id: pid } })
        .then(({ enrollment }) => {
          if (enrollment.season !== currentSeason._id) {
            navigate("/courses#수강신청%20현황", { replace: true });
          }

          if (_.find(enrollment.teachers, { _id: currentUser._id })) {
            if (
              window.confirm(
                "담당 중인 수업입니다. 멘토링 페이지로 이동하시겠습니까?"
              )
            ) {
              navigate(`../mentoring/${enrollment.syllabus}`, {
                replace: true,
              });
            }
          }

          if (enrollment.student !== currentUser._id) {
            navigate("/courses", { replace: true });
          }

          setCourseData(enrollment);
          setEnrollmentData(enrollment);

          let _formEvaluationHeader: any[] = [];
          if (currentRegistration?.permissionEvaluationV2) {
            currentSeason.formEvaluation.forEach((val: any) => {
              const text = val.label;
              const key = "evaluation." + text;

              if (val.auth.edit.student) {
                fieldEvaluationList.push({
                  text,
                  key,
                });
                _formEvaluationHeader.push({
                  text,
                  key,
                  type: val.type ?? "input",
                });
              } else if (val.auth.view.student) {
                _formEvaluationHeader.push({
                  text,
                  key,
                  type: "text",
                  whiteSpace: "pre-wrap",
                });
              }
            });
          } else {
            currentSeason.formEvaluation.forEach((val: any) => {
              if (val.auth.edit.student || val.auth.view.student)
                _formEvaluationHeader.push({
                  text: val.label,
                  key: "evaluation." + val.label,
                  type: "text",
                  whiteSpace: "pre-wrap",
                });
            });
          }
          setFieldEvaluationList([...fieldEvaluationList]);
          setFormEvaluationHeader(_formEvaluationHeader);
          setIsLoading(false);

          // is this syllabus fully confirmed?
          for (let teacher of enrollment.teachers) {
            if (!teacher.confirmed) {
              setConfirmed(false);
              break;
            }
          }
          EnrollmentAPI.REnrollments({
            query: { syllabus: enrollment.syllabus },
          }).then(({ enrollments }) => {
            setEnrollments(enrollments);
          });
        })
        .catch((err) => {
          ALERT_ERROR(err);
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoading]);

  useEffect(() => {
    if (isLoadingEvaluation && pid) {
      EnrollmentAPI.REnrollment({ params: { _id: pid } })
        .then(({ enrollment }) => {
          setEnrollmentData(enrollment);
          setIsLoadingEvaluation(false);
        })
        .catch((err) => {
          alert(err.response?.data?.message ?? "에러가 발생했습니다.");
          navigate("/courses");
        });
    }
    return () => {};
  }, [isLoadingEvaluation]);

  return !isLoading ? (
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
          }}
        >
          <div style={{ wordBreak: "keep-all" }} title="목록으로 이동">
            <span>&nbsp;/&nbsp;</span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/courses#수강%20현황", { replace: true });
              }}
            >
              {`수강 현황 / ${pid}`}
            </span>
          </div>
        </div>
        <div className={style.title}>{enrollmentData?.classTitle}</div>
        <div className={style.categories_container}>
          <div className={style.categories}>{categories()}</div>
        </div>
        <Divider />
        <ClassInfo />
        <div style={{ height: "24px" }}></div>

        <>
          <Divider />

          {formEvaluationHeader.length !== 0 && !isLoadingEvaluation ? (
            <div style={{ marginTop: "24px" }}>
              <div
                className={style.title}
                style={{
                  marginLeft: "12px",
                }}
              >
                평가
              </div>

              {currentRegistration?.permissionEvaluationV2 ? (
                <Table
                  type="object-array"
                  data={[enrollmentData]}
                  header={[
                    ...formEvaluationHeader,
                    {
                      text: "저장",
                      key: "evaluation",
                      onClick: (e: any) => {
                        if (!pid) return;
                        const evaluation: any = {};
                        for (let obj of fieldEvaluationList) {
                          evaluation[obj.text] = e[obj.key];
                        }
                        EnrollmentAPI.UEvaluation({
                          params: {
                            _id: pid,
                          },
                          data: {
                            evaluation,
                          },
                        })
                          .then(() => {
                            alert(SUCCESS_MESSAGE);
                            setIsLoadingEvaluation(true);
                          })
                          .catch((err: any) => ALERT_ERROR(err));
                      },
                      type: "button",

                      textAlign: "center",
                      width: "80px",
                      btnStyle: {
                        round: true,
                        border: true,
                        padding: "4px",
                        color: "red",
                        background: "#FFF1F1",
                      },
                      fontWeight: "600",
                    },
                  ]}
                />
              ) : (
                <Table
                  type="object-array"
                  data={[enrollmentData]}
                  header={formEvaluationHeader}
                />
              )}
            </div>
          ) : (
            <Loading height={"calc(100vh - 55px)"} />
          )}
          <div style={{ height: "24px" }}></div>
          <div className={style.title}>수강생 목록</div>

          <Table
            type="object-array"
            data={enrollments || []}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "학년",
                key: "studentGrade",
                type: "text",
                textAlign: "center",
              },
              {
                text: "ID",
                key: "studentId",
                type: "text",
                textAlign: "center",
              },
              {
                text: "이름",
                key: "studentName",
                type: "text",
                textAlign: "center",
              },
            ]}
          />
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
                },
                {
                  text: "지도교사 ID",
                  key: "userId",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "지도교사 이름",
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
                    false: { text: "미승인", color: "red" },
                    true: { text: "승인됨", color: "green" },
                  },
                },
              ]}
            />
          </Popup>
        )}
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default CourseEnrollment;
