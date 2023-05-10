/**
 * @file Courses Index Page
 * @page 수업 페이지
 * @description 시간표, 수강 현황, 개설 수업, 담당 수업
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

import _ from "lodash";
import Tab from "components/tab/Tab";

import TimeTable from "./tab/TimeTableTab";
import EnrolledCourseList from "./tab/EnrolledCourseList";
import CreatedCourseList from "./tab/CreatedCourseList";
import MentoringCourseList from "./tab/MentoringCourseList";

type Props = {};

const Course = (props: Props) => {
  const navigate = useNavigate();
  const { SyllabusApi } = useApi();

  const { currentSeason, currentUser, currentRegistration } = useAuth();

  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);
  const [createdCourseList, setCreatedCourseList] = useState<any[]>([]);
  const [mentoringCourseList, setMentoringCourseList] = useState<any[]>([]);

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  const structuring = (courseList: any[]) => {
    return _.sortBy(
      courseList.map((course: any) => {
        for (let idx = 0; idx < currentSeason?.subjects?.label.length; idx++) {
          course[currentSeason?.subjects?.label[idx]] = course.subject[idx];
        }
        course.timeText = _.join(
          course.time.map((timeBlock: any) => timeBlock.label),
          ", "
        );
        course.mentorText = _.join(
          course.teachers.map((teacher: any) => teacher.userName),
          ", "
        );

        course.confirmed = !_.find(course.teachers, { confirmed: false });

        const confirmedCnt = _.filter(course.teachers, {
          confirmed: true,
        }).length;
        course.confirmedStatus =
          confirmedCnt === 0
            ? "notConfirmed"
            : confirmedCnt === course.teachers.length
            ? "fullyConfirmed"
            : "semiConfirmed";

        return course;
      }),
      ["subject", "classTitle"]
    );
  };

  const updateCourses = () => {
    SyllabusApi.RCourses({
      season: currentRegistration.season,
      user: currentUser._id,
    }).then((res: any) => {
      setEnrolledCourseList(structuring(res.enrolled));
      setCreatedCourseList(structuring(res.created));
      setMentoringCourseList(structuring(res.mentoring));
    });
    if (currentSeason?.subjects?.label) {
      setSubjectLabelHeaderList([
        ...currentSeason?.subjects?.label?.map((label: string) => {
          return {
            text: label,
            key: label,
            type: "text",
            textAlign: "center",
            whiteSpace: "pre",
          };
        }),
      ]);
    }
  };

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    } else {
      updateCourses();
    }
  }, [currentRegistration]);

  const items = () => {
    if (currentRegistration.role === "teacher")
      return {
        시간표: <TimeTable courseList={enrolledCourseList} />,
        "수강 현황": (
          <EnrolledCourseList
            courseList={enrolledCourseList}
            subjectLabelHeaderList={subjectLabelHeaderList}
          />
        ),
        "개설 수업": (
          <CreatedCourseList
            courseList={createdCourseList}
            subjectLabelHeaderList={subjectLabelHeaderList}
          />
        ),
        "담당 수업": (
          <MentoringCourseList
            courseList={mentoringCourseList}
            subjectLabelHeaderList={subjectLabelHeaderList}
            updateCourses={updateCourses}
          />
        ),
      };
    return {
      시간표: <TimeTable courseList={enrolledCourseList} />,
      "수강 현황": (
        <EnrolledCourseList
          courseList={enrolledCourseList}
          subjectLabelHeaderList={subjectLabelHeaderList}
        />
      ),
      "개설 수업": (
        <CreatedCourseList
          courseList={createdCourseList}
          subjectLabelHeaderList={subjectLabelHeaderList}
        />
      ),
    };
  };
  return (
    <>
      <Navbar />
      <div className={style.section}>
        {currentSeason?.formTimetable ? <Tab items={items()} /> : <></>}
      </div>
    </>
  );
};

export default Course;
