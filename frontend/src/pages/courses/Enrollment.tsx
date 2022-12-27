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

// tab pages
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import _ from "lodash";

import { checkPermission } from "functions/functions";
import Navbar from "layout/navbar/Navbar";

type Props = {};

const CourseEnrollment = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentRegistration, currentSeason } = useAuth();
  const navigate = useNavigate();

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

  async function getEnrollmentData() {
    const result = await database.R({
      location: `enrollments/${pid}`,
    });
    return result;
  }

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

  async function updateEvaluation(evaluation: any[]) {
    console.log("updateEvalu: pid is", pid, " eval is ", evaluation);
    const { evaluation: res } = await database.U({
      location: `enrollments/${pid}/evaluation`,
      data: {
        new: evaluation,
      },
    });
    console.log("res is ", res);
    return res;
  }
  async function getEnrollments(syllabus: string) {
    const { enrollments } = await database.R({
      location: `enrollments/evaluations?syllabus=${syllabus}`,
    });
    return enrollments;
  }

  const categories = () => {
    return (
      <>
        <div className={style.category}>
          {_.join(currentSeason?.subjects.label, "/")}:{" "}
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
        auth="view"
        defaultValues={courseData?.info}
        data={currentSeason?.formSyllabus}
      />
    );
  };

  useEffect(() => {
    if (isLoading) {
      getEnrollmentData()
        .then((result) => {
          console.log("result.teachers: ", result.teachers);
          if (_.find(result.teachers, { userId: currentUser.userId })) {
            navigate(`../mentoring/${result.syllabus}`, {
              replace: true,
            });
          }
          if (result.studentId !== currentUser.userId) {
            console.log("?");
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

          getEnrollments(result.syllabus).then((res: any) => {
            setEnrollments(res);
          });
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
        <NavigationLinks />
        <div className={style.title}>{enrollmentData?.classTitle}</div>
        <div className={style.categories_container}>
          <div className={style.categories}>{categories()}</div>
        </div>
        <Divider />
        <ClassInfo />
        <div style={{ height: "24px" }}></div>

        <>
          <Divider />
          <div style={{ display: "flex", marginTop: "24px" }}>
            <div
              style={{
                flex: "auto",
                marginLeft: "12px",
                display: "flex",
                gap: "12px",
              }}
            >
              <div className={style.title}>평가</div>
            </div>
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
                      console.log(
                        `evaluation[${obj.text}] is ${evaluation[obj.text]}`
                      );
                    }
                    updateEvaluation(evaluation)
                      .then((res: any) => {
                        alert("수정되었습니다.");
                        console.log("update eval: res is ", res);
                        setEnrollmentData({
                          ...enrollmentData,
                          evaluation: res,
                        });
                      })
                      .catch((err: any) => alert(err.response.data.message));
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
    <>로딩중</>
  );
};

export default CourseEnrollment;
