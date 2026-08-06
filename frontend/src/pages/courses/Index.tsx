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
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";

import style from "style/pages/enrollment.module.scss";

import _ from "lodash";
import Tab from "components/tab/Tab";

import TimeTable from "./tab/TimeTableTab";
import EnrolledCourseList from "./tab/Enrolled/List";
import CreatedCourseList from "./tab/Created/List";
import MentoringCourseList from "./tab/Mentoring/List";
import useAPIv2 from "hooks/useAPIv2";
import useRegisterAlterCourseList from "hooks/useRegisterAlterCourseList";
import { useCourseTodos } from "./useCourseTodos";

type Props = {};

const Course = (props: Props) => {
  const navigate = useAppNavigate();
  const location = useLocation();
  const { SyllabusAPI } = useAPIv2();

  const { currentSeason, currentUser, currentRegistration } = useAuth();
  const {
    evaluationBySyllabusId,
    refresh: refreshCourseTodos,
  } = useCourseTodos();

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
    refreshCourseTodos();
  };

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    } else {
      updateCourses();
    }
  }, [currentRegistration]);

  const activeTab = useMemo(() => {
    const fromHash = decodeURIComponent(
      (location.hash || "").replace(/^#/, "")
    ).trim();
    return fromHash || "시간표";
  }, [location.hash]);

  const seasonLabel =
    currentRegistration?.year && currentRegistration?.term
      ? `${currentRegistration.year} ${currentRegistration.term}`
      : "";

  /** 탭에 불러온 수업 목록 (Alter 근거) */
  const coursesForAlter = useMemo(() => {
    if (activeTab === "담당 수업") return mentoringCourseList;
    if (activeTab === "개설 수업") return createdCourseList;
    if (activeTab === "수강 현황") return enrolledCourseList;
    return enrolledCourseList;
  }, [
    activeTab,
    mentoringCourseList,
    createdCourseList,
    enrolledCourseList,
  ]);

  const alterLabel =
    activeTab === "담당 수업"
      ? "담당 수업"
      : activeTab === "개설 수업"
        ? "개설 수업"
        : activeTab === "수강 현황"
          ? "수강 현황"
          : "시간표·수강 수업";

  useRegisterAlterCourseList({
    enabled: !!currentRegistration && !!currentSeason?.formTimetable,
    label: alterLabel,
    seasonLabel,
    getCourses: () => coursesForAlter,
    getEnrolledIds: () =>
      enrolledCourseList.map((c) => String(c._id || "")).filter(Boolean),
  });

  const items = () => {
    if (currentRegistration.role === "teacher")
      return {
        시간표: <TimeTable courseList={enrolledCourseList} />,
        "수강 현황": (
          <EnrolledCourseList
            courseList={enrolledCourseList}
            updateCourses={updateCourses}
            evaluationBySyllabusId={evaluationBySyllabusId}
          />
        ),
        "개설 수업": (
          <CreatedCourseList
            courseList={createdCourseList}
            evaluationBySyllabusId={evaluationBySyllabusId}
          />
        ),
        "담당 수업": (
          <MentoringCourseList
            courseList={mentoringCourseList}
            updateCourses={updateCourses}
            evaluationBySyllabusId={evaluationBySyllabusId}
          />
        ),
      };
    return {
      시간표: <TimeTable courseList={enrolledCourseList} />,
      "수강 현황": (
        <EnrolledCourseList
          courseList={enrolledCourseList}
          updateCourses={updateCourses}
          evaluationBySyllabusId={evaluationBySyllabusId}
        />
      ),
      "개설 수업": (
        <CreatedCourseList
          courseList={createdCourseList}
          evaluationBySyllabusId={evaluationBySyllabusId}
        />
      ),
    };
  };

  return (
    <>
      <div className={style.section}>
        {currentSeason?.formTimetable ? <Tab items={items()} /> : <></>}
      </div>
    </>
  );
};

export default Course;
