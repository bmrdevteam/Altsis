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

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

import _ from "lodash";
import Tab from "components/tab/Tab";

import TimeTable from "./tab/TimeTableTab";
import EnrolledCourseList from "./tab/Enrolled/List";
import CreatedCourseList from "./tab/Created/List";
import MentoringCourseList from "./tab/Mentoring/List";
import useAPIv2 from "hooks/useAPIv2";

type Props = {};

const Course = (props: Props) => {
  const navigate = useNavigate();
  const { SyllabusAPI } = useAPIv2();

  const { currentSeason, currentUser, currentRegistration } = useAuth();

  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);
  const [createdCourseList, setCreatedCourseList] = useState<any[]>([]);
  const [mentoringCourseList, setMentoringCourseList] = useState<any[]>([]);

  const updateCourses = async () => {
    const [
      { enrollments: enrolled, syllabuses: syllabusesEnrolled },
      { syllabuses: created },
      { syllabuses: mentoring },
    ] = await Promise.all([
      SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration.season,
          student: currentUser._id,
        },
      }),
      SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration.season,
          user: currentUser._id,
        },
      }),
      SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration.season,
          teacher: currentUser._id,
        },
      }),
    ]);
    for (let syllabus of syllabusesEnrolled) {
      const idx = _.findIndex(enrolled, { syllabus: syllabus._id });
      if (idx !== -1) {
        enrolled[idx].count = syllabus.count;
      }
    }

    setEnrolledCourseList(enrolled);
    setCreatedCourseList(created);
    setMentoringCourseList(mentoring);
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
        "수강 현황": <EnrolledCourseList courseList={enrolledCourseList} />,
        "개설 수업": <CreatedCourseList courseList={createdCourseList} />,
        "담당 수업": (
          <MentoringCourseList
            courseList={mentoringCourseList}
            updateCourses={updateCourses}
          />
        ),
      };
    return {
      시간표: <TimeTable courseList={enrolledCourseList} />,
      "수강 현황": <EnrolledCourseList courseList={enrolledCourseList} />,
      "개설 수업": <CreatedCourseList courseList={createdCourseList} />,
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
