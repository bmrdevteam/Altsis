import Select from "components/select/Select";
import { useAuth } from "contexts/authContext";
import EditorParser from "editor/EditorParser";

import _ from "lodash";
import { useEffect, useState } from "react";
import useAPIv2 from "hooks/useAPIv2";
import CourseTable from "pages/courses/table/CourseTable";
import { useAppNavigate } from "hooks/useAppNavigate";
import style from "style/pages/enrollment.module.scss";

type Props = {
  user: any;
};

const CoursesTab = (props: Props) => {
  const { user } = props;

  const { SyllabusAPI } = useAPIv2();
  const { currentRegistration } = useAuth();

  const [selectedTab, setSelectedTab] = useState<any>("timeTable");

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
          student: props.user._id,
        },
      }),
      SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration.season,
          user: props.user._id,
        },
      }),
      SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration.season,
          teacher: props.user._id,
        },
      }),
    ]);
    for (let syllabus of syllabusesEnrolled) {
      const idx = _.findIndex(enrolled, { syllabus: syllabus._id });
      if (idx !== -1) {
        enrolled[idx].count = syllabus.count;
        enrolled[idx]._id = syllabus._id;
      }
    }

    setEnrolledCourseList(enrolled);
    setCreatedCourseList(created);
    setMentoringCourseList(mentoring);
  };

  // Get user enrollments in current season
  useEffect(() => {
    if (currentRegistration && user) {
      updateCourses();
    }
  }, [currentRegistration, user]);

  return (
    <>
      <Select
        options={[
          { text: "시간표", value: "timeTable" },
          { text: "수강 현황", value: "enrollments" },
          { text: "개설 수업", value: "myDesgins" },
          { text: "담당 수업", value: "mentoring" },
        ]}
        onChange={setSelectedTab}
        appearence={"flat"}
        style={{ marginBottom: "12px" }}
      />
      <TimeTable
        selected={selectedTab}
        enrolledCourseList={enrolledCourseList}
      />
      <Enrollments
        selected={selectedTab}
        enrolledCourseList={enrolledCourseList}
      />
      <MyDesgins selected={selectedTab} createdCourseList={createdCourseList} />
      <Mentoring
        selected={selectedTab}
        mentoringCourseList={mentoringCourseList}
        user={user}
      />
    </>
  );
};

const TimeTable = (props: {
  selected: string;
  enrolledCourseList: Array<any>;
}) => {
  const { currentSeason } = useAuth();

  const navigate = useAppNavigate();

  function syllabusToTime(s: any) {
    let result = {};
    if (s) {
      for (let i = 0; i < s.length; i++) {
        const element = s[i];
        for (let ii = 0; ii < element.time.length; ii++) {
          Object.assign(result, {
            [element.time[ii].label]:
              element.classTitle + "(" + element.classroom + ")",
          });
        }
      }
    }

    return result;
  }

  function syllabusIdByTime(s: any) {
    let result = {};
    if (s) {
      for (let i = 0; i < s.length; i++) {
        const element = s[i];
        for (let ii = 0; ii < element.time.length; ii++) {
          Object.assign(result, {
            [element.time[ii].label]: element._id,
          });
        }
      }
    }

    return result;
  }

  if (props.selected !== "timeTable") {
    return null;
  }

  return (
    <EditorParser
      type="timetable"
      auth="view"
      defaultTimetable={syllabusToTime(props.enrolledCourseList)}
      idTimetable={syllabusIdByTime(props.enrolledCourseList)}
      onClickCourse={(id: string) => {
        navigate(`/courses/mentoring/${id}`);
      }}
      data={currentSeason?.formTimetable}
    />
  );
};

const Enrollments = (props: {
  selected: string;
  enrolledCourseList: any[];
}) => {
  const { currentSeason, currentRegistration } = useAuth();

  if (props.selected !== "enrollments") {
    return null;
  }

  const totalCourses = props.enrolledCourseList.length;
  const totalPoint = props.enrolledCourseList.reduce(
    (acc, cur) => acc + (cur.point || 0),
    0
  );
  const totalTimeSlots = props.enrolledCourseList.reduce(
    (acc, cur) => acc + (cur.time?.length || 0),
    0
  );

  const formEvaluation = currentSeason?.formEvaluation ?? [];

  const evaluationCounts: { label: string; count: number }[] = [];
  if (currentRegistration.role === "teacher") {
    for (const field of formEvaluation) {
      let count = 0;
      for (const item of props.enrolledCourseList) {
        if (item.evaluation?.[field.label]?.toString().trim()) {
          count++;
        }
      }
      evaluationCounts.push({ label: field.label, count });
    }
  }

  const summaryItems: { label: string; value: string }[] = [
    { label: "수강 과목", value: `${totalCourses}과목` },
    { label: "총 학점", value: `${totalPoint}학점` },
    { label: "주간 수업 시수", value: `${totalTimeSlots}시수` },
    ...evaluationCounts.map((ec) => ({
      label: ec.label,
      value: `${ec.count}/${totalCourses}`,
    })),
  ];

  return (
    <>
      <div className={style.summary_grid} style={{ marginBottom: "12px" }}>
        {summaryItems.map((item, i) => (
          <div className={style.summary_item} key={i}>
            <span className={style.summary_label}>{item.label}</span>
            <span className={style.summary_value}>{item.value}</span>
          </div>
        ))}
      </div>
      <CourseTable
        data={props.enrolledCourseList}
        subjectLabels={currentSeason?.subjects?.label ?? []}
      />
    </>
  );
};

const MyDesgins = (props: { selected: string; createdCourseList: any[] }) => {
  const { currentSeason } = useAuth();

  if (props.selected !== "myDesgins") {
    return null;
  }

  return (
    <CourseTable
      data={props.createdCourseList}
      subjectLabels={currentSeason?.subjects?.label ?? []}
    />
  );
};

const Mentoring = (props: {
  selected: string;
  mentoringCourseList: any[];
  user: any;
}) => {
  const { currentSeason } = useAuth();

  if (props.selected !== "mentoring") {
    return null;
  }

  return (
    <CourseTable
      data={props.mentoringCourseList}
      subjectLabels={currentSeason?.subjects?.label ?? []}
    />
  );
};

export default CoursesTab;
