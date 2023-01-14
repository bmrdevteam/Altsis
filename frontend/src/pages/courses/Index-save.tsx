/**
 * @file Course Index Page
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
import useApi from "hooks/useApi";

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

// components
import Table from "components/tableV2/Table";

import _ from "lodash";
import EditorParser from "editor/EditorParser";
import Divider from "components/divider/Divider";

type Props = {};

const Course = (props: Props) => {
  const { EnrollmentApi } = useApi();
  const navigate = useNavigate();

  const { currentSeason, currentUser, currentRegistration } = useAuth();

  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  async function getEnrolledCourseList() {
    const myEnrollments = await EnrollmentApi.REnrolllments({
      season: currentRegistration?.season,
      studentId: currentUser?.userId,
    });
    if (myEnrollments.length === 0) return [];

    const sylEnrollments = await EnrollmentApi.REnrolllments({
      syllabuses: myEnrollments.map((e: any) => e.syllabus),
    });

    const cnt = _.countBy(
      sylEnrollments.map((enrollment: any) => enrollment.syllabus)
    );

    // enrollments to syllabus
    const syllabuses = myEnrollments.map((e: any) => {
      return {
        ...e,
        enrollment: e._id,
        _id: e.syllabus,
        count_limit: `${cnt[e.syllabus] || 0}/${e.limit}`,
      };
    });

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
      return syllabus;
    });
  };

  const subjectHeaderList = [
    {
      text: "수업명",
      key: "classTitle",
      type: "text",
      textAlign: "center",
    },

    {
      text: "시간",
      key: "timeText",
      type: "string",
      textAlign: "center",
    },
    {
      text: "강의실",
      key: "classroom",
      type: "string",
      textAlign: "center",
    },

    {
      text: "학점",
      key: "point",
      type: "string",
      textAlign: "center",
    },
    {
      text: "개설자",
      key: "userName",
      type: "string",
      textAlign: "center",
    },
    {
      text: "멘토",
      key: "mentorText",
      type: "string",
      textAlign: "center",
    },
    {
      text: "자세히",
      key: "detail",
      type: "button",
      onClick: (e: any) => {
        navigate(`${e.enrollment}`, {
          replace: true,
        });
      },
      width: "72px",
      textAlign: "center",
      btnStyle: {
        border: true,
        color: "black",
        padding: "4px",
        round: true,
      },
    },
  ];

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    } else {
      getEnrolledCourseList().then((res: any) => {
        setEnrolledCourseList(structuring(res));
      });
      if (currentSeason?.subjects?.label) {
        setSubjectLabelHeaderList([
          ...currentSeason?.subjects?.label?.map((label: string) => {
            return {
              text: label,
              key: label,
              type: "text",
              textAlign: "center",
            };
          }),
        ]);
      }
    }
  }, [currentRegistration]);

  function syllabusToTime(s: any) {
    let result = {};
    if (s) {
      for (let i = 0; i < s.length; i++) {
        const element = s[i];
        for (let ii = 0; ii < element.time.length; ii++) {
          Object.assign(result, {
            [element.time[ii].label]: element.classTitle,
          });
        }
      }
    }

    return result;
  }

  return (
    <>
      <Navbar />
      <div className={style.section}>
        {currentSeason?.formTimetable && (
          <>
            <div className={style.title}>시간표</div>
            <EditorParser
              auth="view"
              defaultTimetable={syllabusToTime(enrolledCourseList)}
              data={currentSeason?.formTimetable}
            />
            <div style={{ height: "24px" }}></div>
            <Divider />
            <div style={{ height: "24px" }}></div>
          </>
        )}

        <div className={style.title}>수강신청 현황</div>

        <Table
          type="object-array"
          data={enrolledCourseList}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            ...subjectLabelHeaderList,
            ...subjectHeaderList,
          ]}
        />
      </div>
    </>
  );
};

export default Course;
