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
    return courseList.map((course: any) => {
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

      return course;
    });
  };

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    } else {
      SyllabusApi.RCourses({
        season: currentRegistration.season,
        user: currentUser._id,
      }).then((res: any) => {
        console.log("res: ", res);
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
    }
  }, [currentRegistration]);

  const items = () => {
    if (currentRegistration.role === "teacher")
      return {
        시간표: <TimeTable courseList={enrolledCourseList} />,
        "수강신청 현황": (
          <EnrolledCourseList
            courseList={enrolledCourseList}
            subjectLabelHeaderList={subjectLabelHeaderList}
          />
        ),
        "개설한 수업 목록": (
          <CreatedCourseList
            courseList={createdCourseList}
            subjectLabelHeaderList={subjectLabelHeaderList}
          />
        ),
        "담당 수업 목록": (
          <MentoringCourseList
            courseList={mentoringCourseList}
            subjectLabelHeaderList={subjectLabelHeaderList}
          />
        ),
      };
    return {
      시간표: <TimeTable courseList={enrolledCourseList} />,
      "수강신청 현황": (
        <EnrolledCourseList
          courseList={enrolledCourseList}
          subjectLabelHeaderList={subjectLabelHeaderList}
        />
      ),
      "개설한 수업 목록": (
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
