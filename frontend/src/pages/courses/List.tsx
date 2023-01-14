/**
 * @file Courses List Page
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
import Table from "components/tableV2/Table";

import ViewPopup from "./view/ViewPopup";

import _ from "lodash";
import Loading from "components/loading/Loading";

type Props = {};

const Courses = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();

  const { currentSeason, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [courseList, setCourseList] = useState<any[]>([]);

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);
  const [course, setCourse] = useState<string>();

  async function getCreatedCourseList() {
    const { syllabuses, enrollments } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}`,
    });
    if (syllabuses.length === 0) return [];

    const count = _.countBy(
      enrollments.map((enrollment: any) => enrollment.syllabus)
    );

    for (let syllabus of syllabuses) {
      syllabus.count_limit = `${count[syllabus._id] || 0}/${syllabus.limit}`;
    }

    return syllabuses;
  }

  const structuring = (courseList: any[]) => {
    return courseList.map((syllabus: any) => {
      for (let idx = 0; idx < currentSeason?.subjects?.label.length; idx++) {
        syllabus[currentSeason?.subjects?.label[idx]] = syllabus.subject[idx];
      }
      syllabus.timeText = _.join(
        syllabus.time.map((timeBlock: any) => timeBlock.label),
        ", "
      );
      syllabus.mentorText = _.join(
        syllabus.teachers.map((teacher: any) => teacher.userName),
        ", "
      );
      syllabus.confirmed = true;
      for (let teacher of syllabus.teachers) {
        if (!teacher.confirmed) {
          syllabus.confirmed = false;
          break;
        }
      }
      return syllabus;
    });
  };

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
      text: "자세히",
      key: "courseName",
      type: "button",
      onClick: (e: any) => {
        setCourse(e._id);
        setViewPopupActive(true);
      },
      width: "80px",
      textAlign: "center",
    },
  ];

  useEffect(() => {
    if (isLoading) {
      if (!currentRegistration) {
        alert("등록된 학기가 없습니다.");
        navigate("/");
      } else {
        getCreatedCourseList().then((res: any) => {
          setCourseList(structuring(res));

          if (currentSeason?.subjects?.label) {
            setSubjectLabelHeaderList([
              ...currentSeason?.subjects?.label.map((label: string) => {
                return {
                  text: label,
                  key: label,
                  type: "text",
                  textAlign: "center",
                  wordBreak: "keep-all",
                  width: "80px",
                };
              }),
            ]);
          }

          setIsLoading(false);
        });
      }
    }
  }, [isLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수업 목록</div>
        <div style={{ height: "24px" }}></div>
        {!isLoading ? (
          <Table
            control
            defaultPageBy={50}
            type="object-array"
            data={courseList}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
                whiteSpace: "pre",
              },
              ...subjectLabelHeaderList,
              ...subjectHeaderList,
            ]}
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
      {viewPopupActive && course && (
        <ViewPopup course={course} setPopupActive={setViewPopupActive} />
      )}
    </>
  );
};

export default Courses;
