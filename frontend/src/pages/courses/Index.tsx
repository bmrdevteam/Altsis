/**
 * @file Courses Index Page
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
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

// components
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import Button from "components/button/Button";

import _ from "lodash";

type Props = {};

const Courses = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();

  const { currentSeason, currentUser, currentRegistration } = useAuth();

  const [createdCourseList, setCreatedCourseList] = useState<any[]>([]);
  const [mentoringCourseList, setMentoringCourseList] = useState<any[]>([]);
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);

  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);

  /* subject label header list */
  const [subjectHeaderList, setSubjectHeaderList] = useState<any[]>([]);

  async function getCreatedCourseList() {
    const { syllabuses: res } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}&userId=${currentUser?.userId}`,
    });
    return res;
  }

  async function getMentoringCourseList() {
    const { syllabuses: res } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}&teacherId=${currentUser?.userId}`,
    });
    return res;
  }

  async function getEnrolledCourseList() {
    const { enrollments: res } = await database.R({
      location: `enrollments?season=${currentRegistration?.season}&studentId=${currentUser?.userId}`,
    });
    return res;
  }

  async function getCourseList() {
    const [createdCourseList, mentoringCourseList, enrolledCourseList] =
      await Promise.all([
        getCreatedCourseList(),
        getMentoringCourseList(),
        getEnrolledCourseList(),
      ]);

    return {
      createdCourseList,
      mentoringCourseList,
      enrolledCourseList,
    };
  }

  const labelling = (courseList: any[]) => {
    return courseList.map((syllabus: any) => {
      for (let idx = 0; idx < currentSeason.subjects?.label.length; idx++) {
        syllabus[currentSeason.subjects?.label[idx]] = syllabus.subject[idx];
      }
      return syllabus;
    });
  };

  useEffect(() => {
    if (!currentRegistration) {
      setAlertPopupActive(true);
    } else {
      getCourseList().then((res: any) => {
        setCreatedCourseList(labelling(res["createdCourseList"]));
        setMentoringCourseList(labelling(res["mentoringCourseList"]));
        setEnrolledCourseList(labelling(res["enrolledCourseList"]));
      });
      setSubjectHeaderList([
        ...currentSeason?.subjects?.label.map((label: string) => {
          return {
            text: label,
            key: label,
            type: "string",
            width: "120px",
          };
        }),
      ]);
    }
  }, [currentRegistration]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>개설한 수업 목록</div>
        <div style={{ height: "24px" }}></div>

        <Table
          filter
          type="object-array"
          data={createdCourseList}
          header={[
            ...subjectHeaderList,

            {
              text: "수업명",
              key: "classTitle",
              type: "string",
            },
            {
              text: "학점",
              key: "point",
              type: "string",
              width: "80px",
            },
            {
              text: "시간",
              key: "time",
              type: "string",
              returnFunction: (e) =>
                _.join(
                  e.map((timeBlock: any) => timeBlock.label),
                  ", "
                ),
            },
            {
              text: "강의실",
              key: "classroom",
              type: "string",
              width: "120px",
            },

            {
              text: "멘토",
              key: "teachers",
              returnFunction: (e: any) => {
                return _.join(
                  e.map((teacher: any) => {
                    return teacher.userName;
                  }),
                  ", "
                );
              },
              onClick: (value) => {
                console.log(value);
              },
              type: "string",
              width: "120px",
            },

            {
              text: "상태",
              key: "teachers",
              returnFunction: (e: any) => {
                for (let teacher of e) {
                  if (!teacher.confirmed) return "미승인";
                }
                return "승인됨";
              },
              type: "string",
              width: "120px",
            },
            {
              text: "자세히",
              key: "courseName",
              type: "button",
              onClick: (e: any) => {
                navigate(`../courses/${e._id}`, {
                  replace: true,
                });
              },
              width: "80px",
              align: "center",
            },
          ]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />
      </div>
      {currentRegistration?.role === "teacher" && (
        <div className={style.section}>
          <div className={style.title}>멘토로 등록된 수업 목록</div>
          <div style={{ height: "24px" }}></div>

          <Table
            filter
            type="object-array"
            data={mentoringCourseList}
            header={[
              ...subjectHeaderList,

              {
                text: "수업명",
                key: "classTitle",
                type: "string",
              },
              {
                text: "학점",
                key: "point",
                type: "string",
                width: "80px",
              },
              {
                text: "시간",
                key: "time",
                type: "string",
                returnFunction: (e) =>
                  _.join(
                    e.map((timeBlock: any) => timeBlock.label),
                    ", "
                  ),
              },
              {
                text: "강의실",
                key: "classroom",
                type: "string",
                width: "120px",
              },

              {
                text: "개설자",
                key: "userName",
                type: "string",
                width: "120px",
              },

              {
                text: "상태",
                key: "teachers",
                type: "string",
                returnFunction: (e: any) => {
                  for (let teacher of e) {
                    if (!teacher.confirmed) return "미승인";
                  }
                  return "승인됨";
                },
                onClick: (value) => {
                  alert("clicked!");
                },
                width: "120px",
              },
              {
                text: "자세히",
                key: "courseName",
                type: "button",
                onClick: (e: any) => {
                  navigate(`../courses/${e._id}`, {
                    replace: true,
                  });
                },
                width: "80px",
                align: "center",
              },
            ]}
            style={{ bodyHeight: "calc(100vh - 300px)" }}
          />
        </div>
      )}

      <div className={style.section}>
        <div className={style.title}>수강신청한 수업 목록</div>
        <div style={{ height: "24px" }}></div>

        <Table
          filter
          type="object-array"
          data={enrolledCourseList}
          header={[
            ...subjectHeaderList,

            {
              text: "수업명",
              key: "classTitle",
              type: "string",
            },
            {
              text: "학점",
              key: "point",
              type: "string",
              width: "80px",
            },
            {
              text: "시간",
              key: "time",
              type: "string",
              returnFunction: (e) =>
                _.join(
                  e.map((timeBlock: any) => timeBlock.label),
                  ", "
                ),
            },
            {
              text: "강의실",
              key: "classroom",
              type: "string",
              width: "120px",
            },

            {
              text: "개설자",
              key: "userName",
              type: "string",
              width: "120px",
            },

            {
              text: "상태",
              key: "teachers",
              type: "string",
              returnFunction: (e: any) => {
                for (let teacher of e) {
                  if (!teacher.confirmed) return "미승인";
                }
                return "승인됨";
              },
              onClick: (value) => {
                alert("clicked!");
              },
              width: "120px",
            },
            {
              text: "자세히",
              key: "courseName",
              type: "button",
              onClick: (e: any) => {
                navigate(`../courses/${e._id}`, {
                  replace: true,
                });
              },
              width: "80px",
              align: "center",
            },
          ]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />
      </div>
      {alertPopupActive && (
        <Popup setState={() => {}} title="가입된 시즌이 없습니다">
          <div style={{ marginTop: "12px" }}>
            <Button
              type="ghost"
              onClick={() => {
                navigate("/");
              }}
            >
              메인 화면으로 돌아가기
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Courses;
