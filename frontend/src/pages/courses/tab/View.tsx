/**
 * @file Courses View Page
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
import { useNavigate } from "react-router-dom";
import useDatabase from "hooks/useDatabase";
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import EditorParser from "editor/EditorParser";

import Send from "../../notifications/popup/Send";
import EnrollBulkPopup from "./EnrollBulkPopup";

import _, { omit } from "lodash";
import Svg from "assets/svg/Svg";
import Navbar from "layout/navbar/Navbar";
type Props = {
  courseData: any;
  setCourseData: any;
  setMode: any;
};

type receiverSelectedList = {
  [key: string]: boolean;
};

const CourseView = (props: Props) => {
  const navigate = useNavigate();
  const { currentSeason, currentUser, currentRegistration } = useAuth();
  const database = useDatabase();

  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);
  const [enrollBulkPopupActive, setEnrollBulkPopupActive] =
    useState<boolean>(false);

  const [confirmed, setConfirmed] = useState<boolean>(true);

  const [isUser, setIsUser] = useState<boolean>(false);
  const [isMentor, setIsMentor] = useState<boolean>(false);
  const [mentorIdx, setMentorIdx] = useState<number>(-1);
  const [mentorConfirmed, setMentorConfirmed] = useState<boolean>();

  const [isEnrollmentListLoading, setIsEnrollmentListLoading] =
    useState<boolean>(true);
  const [enrollmentList, setEnrollmentList] = useState<any[]>();

  /* evaluation header list */
  const [evaluationHeaderList, setEvaluationHeaderList] = useState<any[]>([]);

  const [sendNotificationPopupActive, setSendNotificationPopupActive] =
    useState<boolean>(false);
  const [receiverSelectedList, setReceiverSelectedList] =
    useState<receiverSelectedList>({});
  const [receiverOptionList, setReceiverOptionList] = useState<any[]>([]);

  const checkPermission = () => {
    const permission = currentSeason?.permissionSyllabus;
    for (let i = 0; i < permission.length; i++) {
      if (
        permission[i][0] === "userId" &&
        permission[i][1] === currentUser?.userId
      ) {
        return permission[i][2];
      }
      if (
        permission[i][0] === "role" &&
        permission[i][1] === currentRegistration?.role
      )
        return permission[i][2];
    }
    return false;
  };

  const categories = () => {
    return (
      <>
        {currentSeason?.subjects?.label && (
          <div className={style.category}>
            {_.join(currentSeason?.subjects.label, "/")}:{" "}
            {_.join(props.courseData.subject, "/")}
          </div>
        )}
        <div className={style.category}>
          강의실: {props.courseData.classroom || "없음"}
        </div>
        <div className={style.category}>
          시간:{" "}
          {_.join(
            props.courseData?.time.map((timeBlock: any) => timeBlock.label),
            ", "
          )}
        </div>
        <div className={style.category}>학점: {props.courseData.point}</div>
        <div className={style.category}>수강정원: {props.courseData.limit}</div>
        <div className={style.category}>
          개설자: {props.courseData.userName}
        </div>
        <div className={style.category}>
          멘토:{" "}
          {_.join(
            props.courseData.teachers?.map((teacher: any) => teacher.userName),
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

  async function deleteCourse() {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      const result = database.D({
        location: `syllabuses/${props.courseData._id}`,
      });
      return result;
    } else {
      return false;
    }
  }

  async function unconfirmCourse() {
    const result = database.D({
      location: `syllabuses/${props.courseData._id}/confirmed`,
    });
    return result;
  }

  async function confirmCourse() {
    const result = database.U({
      location: `syllabuses/${props.courseData._id}/confirmed`,
      data: {},
    });
    return result;
  }

  async function getEnrollments() {
    const { enrollments } = await database.R({
      location: `enrollments/evaluations?syllabus=${props.courseData._id}`,
    });
    return enrollments;
  }

  useEffect(() => {
    navigate("#강의 계획");

    if (props.courseData.season !== currentSeason._id) {
      navigate("/courses", { replace: true });
    }
    // is this syllabus fully confirmed?
    for (let teacher of props.courseData.teachers) {
      if (!teacher.confirmed) {
        setConfirmed(false);
        break;
      }
    }

    // Is this user the one who made this syllabus?
    setIsUser(props.courseData.userId === currentUser?.userId);

    // Is this user is mentor of this syllabus?
    if (currentRegistration?.role === "teacher") {
      const mentorIdx = _.findIndex(props.courseData.teachers, {
        userId: currentUser?.userId,
      });
      if (mentorIdx !== -1) {
        setIsMentor(true);
        setMentorIdx(mentorIdx);
        setMentorConfirmed(props.courseData.teachers[mentorIdx].confirmed);
      }
    }

    return () => {};
  }, []);

  useEffect(() => {
    if (isEnrollmentListLoading) {
      getEnrollments().then((res: any) => {
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

  useEffect(() => {
    // is this syllabus fully confirmed?
    let _confirmed = true;
    for (let teacher of props.courseData.teachers) {
      if (!teacher.confirmed) {
        _confirmed = false;
        break;
      }
    }
    if (_confirmed !== confirmed) setConfirmed(_confirmed);

    return () => {};
  }, [mentorConfirmed]);

  const ClassInfo = () => {
    return (
      <EditorParser
        auth="view"
        defaultValues={props.courseData.info}
        data={currentSeason?.formSyllabus}
      />
    );
  };

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{props.courseData.classTitle}</div>
        <div className={style.categories_container}>
          <div className={style.categories}>{categories()}</div>
        </div>
        <Divider />
        <ClassInfo />
        <div style={{ height: "24px" }}></div>
        <Divider />
        {isMentor && enrollmentList?.length === 0 && (
          <Button
            type={"ghost"}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
            onClick={() => {
              if (mentorConfirmed) {
                unconfirmCourse()
                  .then((res) => {
                    alert("unconfirmed");
                    const teachers = props.courseData.teachers;
                    teachers[mentorIdx].confirmed = false;
                    props.setCourseData({
                      ...props.courseData,
                      teachers,
                    });
                    setMentorConfirmed(false);
                  })
                  .catch((err) => {
                    alert("failed to unconfirm");
                  });
              } else {
                confirmCourse()
                  .then((res) => {
                    alert("confirmed");
                    const teachers = props.courseData.teachers;
                    teachers[mentorIdx].confirmed = true;
                    props.setCourseData({
                      ...props.courseData,
                      teachers,
                    });
                    setMentorConfirmed(true);
                  })
                  .catch((err) => {
                    alert("failed to confirm");
                  });
              }
            }}
          >
            {mentorConfirmed ? "승인 취소" : "승인하기"}
          </Button>
        )}
        {isUser && !confirmed && (
          <>
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "12px",
              }}
              onClick={() => {
                alert("clicked");
                props.setMode("edit");
              }}
            >
              수정
            </Button>
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "12px",
              }}
              onClick={() => {
                deleteCourse()
                  .then((res) => {
                    alert("success");
                    navigate("/courses");
                  })
                  .catch((err) => {
                    alert(err.response.body.message);
                  });
              }}
            >
              삭제
            </Button>
          </>
        )}
        <div style={{ height: "24px" }}></div>

        {isMentor ? (
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
                <div className={style.title}>수강생 목록</div>
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
                {
                  text: "평가",
                  key: "evaluation",
                  onClick: (e: any) => {
                    alert("clicked!");
                  },
                  type: "button",

                  textAlign: "center",
                  // textStyle: {
                  //   padding: "0 10px",
                  //   border: "var(--border-default)",
                  //   background: "rgba(200, 200, 255, 0.25)",
                  //   borderColor: "rgba(200, 200, 255)",
                  // },
                },
              ]}
            />
          </>
        ) : (
          <>
            <div className={style.title}>수강생 목록</div>
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
              ]}
            />
          </>
        )}
        {confirmStatusPopupActive && (
          <Popup
            setState={setConfirmStatusPopupActive}
            title="승인 상태"
            closeBtn
          >
            <Table
              type="object-array"
              data={props.courseData.teachers}
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
        {sendNotificationPopupActive && (
          <Send
            setState={setSendNotificationPopupActive}
            receiverOptionList={receiverOptionList}
            receiverSelectedList={receiverSelectedList}
            category={props.courseData.classTitle}
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
            courseData={props.courseData}
            setIsEnrollmentListLoading={setIsEnrollmentListLoading}
          />
        )}
      </div>
    </>
  );
};

export default CourseView;
