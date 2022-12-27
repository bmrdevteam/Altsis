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
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";

// tab pages
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import Svg from "assets/svg/Svg";

import Send from "../../notifications/popup/Send";
import EnrollBulkPopup from "../tab/EnrollBulkPopup";

import _ from "lodash";

import ViewPopup from "../tab/ViewPopup";

import { checkPermission } from "functions/functions";

type Props = {};

type receiverSelectedList = {
  [key: string]: boolean;
};

const CoursePid = (props: Props) => {
  const { pid } = useParams<"pid">();
  const { currentUser, currentSeason } = useAuth();
  const navigate = useNavigate();

  const database = useDatabase();
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

  const [mentorIdx, setMentorIdx] = useState<number>(-1);
  const [mentorConfirmed, setMentorConfirmed] = useState<boolean>();

  const [isEnrollmentListLoading, setIsEnrollmentListLoading] =
    useState<boolean>(false);
  const [enrollmentList, setEnrollmentList] = useState<any[]>([]);

  const [sendNotificationPopupActive, setSendNotificationPopupActive] =
    useState<boolean>(false);
  const [receiverSelectedList, setReceiverSelectedList] =
    useState<receiverSelectedList>({});
  const [receiverOptionList, setReceiverOptionList] = useState<any[]>([]);

  async function unconfirmCourse() {
    const result = database.D({
      location: `syllabuses/${courseData?._id}/confirmed`,
    });
    return result;
  }

  async function confirmCourse() {
    const result = database.U({
      location: `syllabuses/${courseData?._id}/confirmed`,
      data: {},
    });
    return result;
  }

  async function getSeason(_id: string) {
    const res = await database.R({
      location: `seasons/${_id}`,
    });
    return res;
  }

  async function getEnrollments(_id: string) {
    const { enrollments } = await database.R({
      location: `enrollments/evaluations?syllabus=${_id}`,
    });
    return enrollments;
  }

  async function updateEvaluation(enrollment: string, evaluation: any[]) {
    const { evaluation: res } = await database.U({
      location: `enrollments/${enrollment}/evaluation`,
      data: {
        new: evaluation,
      },
    });
    return res;
  }

  useEffect(() => {
    if (courseData) {
      // is this syllabus fully confirmed?
      for (let teacher of courseData?.teachers) {
        if (!teacher.confirmed) {
          setConfirmed(false);
          break;
        }
      }

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
      getEnrollments(courseData._id).then((res: any) => {
        setEnrollmentList(res);
        setReceiverOptionList(
          res.map((e: any) => {
            return {
              value: JSON.stringify({
                userId: e.studentId,
                userName: e.studentName,
              }),
              text: `${e.studentName}(${e.studentId})`,
            };
          })
        );
      });
      setIsEnrollmentListLoading(false);
    }

    return () => {};
  }, [isEnrollmentListLoading]);

  async function getCourseData() {
    console.log("pid is ", pid);
    const result = await database.R({
      location: `syllabuses/${pid}`,
    });
    return result;
  }

  useEffect(() => {
    if (isLoading) {
      if (isLoading) {
        if (!currentSeason) navigate("/", { replace: true });

        getCourseData()
          .then((result) => {
            if (result.season !== currentSeason._id)
              navigate("/courses/mentoring", { replace: true });

            setCourseData(result);
            getEnrollments(result._id).then((res: any) => {
              setEnrollmentList(res);
              setReceiverOptionList(
                res.map((e: any) => {
                  return {
                    value: JSON.stringify({
                      userId: e.studentId,
                      userName: e.studentName,
                    }),
                    text: `${e.studentName}(${e.studentId})`,
                  };
                })
              );
              getSeason(result.season).then((res: any) => {
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
                } else {
                  res.formEvaluation.forEach((val: any) => {
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
            });
          })
          .catch((err) => {
            console.log("err: ", err);
            alert(err.response.data.message);
            navigate("/courses");
          });
      }
    }
    return () => {};
  }, [isLoading]);

  return !isLoading ? (
    <div className={style.section}>
      <NavigationLinks />
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
            상태: {mentorConfirmed ? "승인됨" : "미승인"}
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

            <div
              className={style.icon}
              onClick={(e: any) => {
                const receiverSelectedList: receiverSelectedList = {};
                for (let e of enrollmentList || []) {
                  receiverSelectedList[
                    JSON.stringify({
                      userId: e.studentId,
                      userName: e.studentName,
                    })
                  ] = true;
                }

                setReceiverSelectedList({ ...receiverSelectedList });
                setSendNotificationPopupActive(true);
              }}
              style={{ display: "flex", gap: "4px" }}
            >
              <Svg type="send" width="20px" height="20px" />
              알림
            </div>
          </div>
        </div>
        {permissionEvaluation ? (
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
                  updateEvaluation(e._id, evaluation)
                    .then((res: any) => {
                      alert("수정되었습니다.");
                      console.log("update eval: res is ", res);
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
            data={enrollmentList || []}
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
            onChange={(value) => {
              console.log(value);
            }}
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
          <Button
            type={"ghost"}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              marginTop: "24px",
            }}
            disabled={enrollmentList && enrollmentList.length > 0}
            onClick={() => {
              if (mentorConfirmed) {
                unconfirmCourse()
                  .then((res) => {
                    alert("unconfirmed");
                    const teachers = courseData.teachers;
                    teachers[mentorIdx].confirmed = false;
                    setCourseData({
                      ...courseData,
                      teachers,
                    });
                    setMentorConfirmed(false);
                    setConfirmStatusPopupActive(false);
                  })
                  .catch((err) => {
                    alert("failed to unconfirm");
                  });
              } else {
                confirmCourse()
                  .then((res) => {
                    alert("confirmed");
                    const teachers = courseData.teachers;
                    teachers[mentorIdx].confirmed = true;

                    setCourseData({
                      ...courseData,
                      teachers,
                    });
                    setMentorConfirmed(true);
                    setConfirmStatusPopupActive(false);
                  })
                  .catch((err) => {
                    alert("failed to confirm");
                  });
              }
            }}
          >
            {mentorConfirmed ? "승인 취소" : "승인하기"}
          </Button>
        </Popup>
      )}
      {sendNotificationPopupActive && (
        <Send
          setState={setSendNotificationPopupActive}
          receiverOptionList={receiverOptionList}
          receiverSelectedList={receiverSelectedList}
          category={courseData?.classTitle}
          receiverList={enrollmentList?.map((enrollment: any) => {
            return {
              ...enrollment,
              userId: enrollment.studentId,
              userName: enrollment.studentName,
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
        <ViewPopup course={pid} setPopupActive={setViewPopupActive} />
      )}
    </div>
  ) : (
    <>로딩중</>
  );
};

export default CoursePid;
