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
import Table from "components/table/Table";

import EditorParser from "editor/EditorParser";

import _ from "lodash";
type Props = {
  courseData: any;
  setCourseData: any;
  setMode: any;
};

const CourseView = (props: Props) => {
  const navigate = useNavigate();
  const { currentSeason, currentUser, currentRegistration } = useAuth();
  const database = useDatabase();

  const [confirmStatusPopupActive, setConfirmStatusPopupActive] =
    useState<boolean>(false);

  const [confirmed, setConfirmed] = useState<boolean>(true);

  const [isUser, setIsUser] = useState<boolean>(false);
  const [isMentor, setIsMentor] = useState<boolean>(false);
  const [mentorIdx, setMentorIdx] = useState<number>(-1);
  const [mentorConfirmed, setMentorConfirmed] = useState<boolean>();

  const checkPermission = () => {
    const permission = currentSeason.permissionSyllabus;
    for (let i = 0; i < permission.length; i++) {
      if (
        permission[i][0] === "userId" &&
        permission[i][1] === currentUser.userId
      ) {
        return permission[i][2];
      }
      if (
        permission[i][0] === "role" &&
        permission[i][1] === currentRegistration.role
      )
        return permission[i][2];
    }
    return false;
  };

  const categories = () => {
    return (
      <>
        <div className={style.category}>
          {_.join(currentSeason?.subjects.label, "/")}:{" "}
          {_.join(props.courseData.subject, "/")}
        </div>
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
        <div className={style.category}>
          시간:{" "}
          {_.join(
            props.courseData?.time.map((timeBlock: any) => {
              return timeBlock.label;
            }),
            ", "
          )}
        </div>
        <div className={style.category}>학점: {props.courseData.point}</div>
        <div className={style.category}>
          강의실: {props.courseData.classroom || "없음"}
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

  useEffect(() => {
    navigate("#강의 계획");

    // is this syllabus fully confirmed?
    for (let teacher of props.courseData.teachers) {
      if (!teacher.confirmed) {
        setConfirmed(false);
        break;
      }
    }

    // Is this user the one who made this syllabus?
    setIsUser(props.courseData.userId === currentUser.userId);

    // Is this user is mentor of this syllabus?
    if (currentRegistration.role === "teacher") {
      const mentorIdx = _.findIndex(props.courseData.teachers, {
        userId: currentUser.userId,
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
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>{props.courseData.classTitle}</div>
      <div className={style.categories_container}>
        <div className={style.categories}>{categories()}</div>
      </div>
      <Divider />

      <ClassInfo />
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
                key: "",
                type: "index",
                width: "48px",
                align: "center",
              },
              {
                text: "멘토",
                key: "userName",
                type: "string",
              },

              {
                text: "상태",
                key: "confirmed",
                type: "string",
                returnFunction: (e: boolean) => {
                  return e ? "승인됨" : "미승인";
                },
              },
            ]}
          />
        </Popup>
      )}
      {isMentor ? (
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            marginTop: "24px",
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
      ) : (
        <></>
      )}
      {isUser && !confirmed && checkPermission() ? (
        <>
          <Button
            type={"ghost"}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              marginTop: "24px",
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
      ) : (
        <></>
      )}
    </div>
  );
};

export default CourseView;