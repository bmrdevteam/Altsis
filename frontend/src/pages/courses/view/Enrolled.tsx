/**
 * @file Courses Enrollment Page
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
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
// tab pages
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import _ from "lodash";

import { checkPermission } from "functions/functions";
import Navbar from "layout/navbar/Navbar";
import Loading from "components/loading/Loading";

type Props = {};

const CourseEnrollment = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentRegistration, currentSeason } = useAuth();
  const navigate = useNavigate();
  const { EnrollmentApi } = useApi();

  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [enrollmentData, setEnrollmentData] = useState<any>();

  const [courseData, setCourseData] = useState<any>();
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);
  const [fieldEvaluationList, setFieldEvaluationList] = useState<any[]>([]);
  const [permissionEvaluation, setPermissionEvaluation] =
    useState<boolean>(false);

  const [enrollments, setEnrollments] = useState<any[]>();

  async function getSeason(_id: string) {
    const res = await database.R({
      location: `seasons/${_id}`,
    });
    return res;
  }

  async function getCourseData(_id: string) {
    const res = await database.R({
      location: `syllabuses/${_id}`,
    });
    return res;
  }

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
          멘토:{" "}
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
    if (isLoading) {
      EnrollmentApi.REnrolllment(pid)
        .then((result) => {
          if (
            result.season !== currentSeason._id ||
            result.studentId !== currentUser.userId
          ) {
            navigate("/courses#수강신청%20현황", { replace: true });
          }

          if (_.find(result.teachers, { userId: currentUser.userId })) {
            navigate(`../mentoring/${result.syllabus}`, {
              replace: true,
            });
          }
          if (result.studentId !== currentUser.userId) {
            navigate("/courses", { replace: true });

            // navigate("/courses");
          }
          getCourseData(result.syllabus).then((res) => setCourseData(res));
          setEnrollmentData(result);
          getSeason(result.season).then((res: any) => {
            let _formEvaluationHeader: any[] = [];
            if (
              checkPermission(
                res.permissionEvaluation,
                currentUser.userId,
                currentRegistration.role
              )
            ) {
              setPermissionEvaluation(true);
              res.formEvaluation.forEach((val: any) => {
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
                    type: "input",
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
              //   .map((val: any) => {
              //     if (val.auth.edit.student) {
              //       fieldEvaluationList.push({
              //         text: val.label,
              //         key: "evaluation." + val.label,
              //       });
              //       return {
              //         text: val.label,
              //         key: "evaluation." + val.label,
              //         type: "input",
              //       };
              //     }
              //     if (val.auth.view.student) {
              //       return {
              //         text: val.label,
              //         key: "evaluation." + val.label,
              //         type: "text",
              //         whiteSpace: "pre-wrap",
              //       };
              //     }
              //     return undefined;
              //   })
              //   .filter((element: any, i: number) => element !== undefined);
            } else {
              res.formEvaluation.forEach((val: any) => {
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
          });
          // is this syllabus fully confirmed?
          for (let teacher of result.teachers) {
            if (!teacher.confirmed) {
              setConfirmed(false);
              break;
            }
          }
          EnrollmentApi.REnrolllments({ syllabus: result.syllabus }).then(
            (res: any) => {
              setEnrollments(res);
            }
          );
        })
        .catch((err) => {
          alert(err.response.data.message);
          navigate("/courses");
        });
    }
    return () => {};
  }, []);

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

          {formEvaluationHeader.length !== 0 && (
            <div style={{ marginTop: "24px" }}>
              <div
                className={style.title}
                style={{
                  marginLeft: "12px",
                }}
              >
                평가
              </div>

              {permissionEvaluation ? (
                <Table
                  type="object-array"
                  data={[enrollmentData]}
                  header={[
                    ...formEvaluationHeader,
                    {
                      text: "저장",
                      key: "evaluation",
                      onClick: (e: any) => {
                        const evaluation: any = {};
                        for (let obj of fieldEvaluationList) {
                          evaluation[obj.text] = e[obj.key];
                        }
                        EnrollmentApi.UEvaluation({
                          enrollment: pid,
                          by: "student",
                          data: evaluation,
                        })
                          .then((res: any) => {
                            alert("수정되었습니다.");
                            setEnrollmentData({
                              ...enrollmentData,
                              evaluation: res,
                            });
                          })
                          .catch((err: any) =>
                            alert(err.response.data.message)
                          );
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
