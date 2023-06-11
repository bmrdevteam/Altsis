import Select from "components/select/Select";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import EditorParser from "editor/EditorParser";
import ViewPopup from "pages/courses/view/ViewPopup";

import useApi from "hooks/useApi";
import _ from "lodash";
import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  user: any;
};

const getSubjectHeaderList = (options: { onDetail: any }) => [
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
    onClick: options.onDetail,
    width: "72px",
    textAlign: "center",
    btnStyle: {
      border: true,
      color: "var(--accent-2)",
      padding: "4px",
      round: true,
    },
  },
];

const CoursesTab = (props: Props) => {
  const { user } = props;

  const { EnrollmentApi } = useApi();
  const { currentSeason, currentRegistration } = useAuth();

  const [selectedTab, setSelectedTab] = useState<any>("timeTable");
  const [enrollments, setEnrollments] = useState<any>();
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);

  const [popupCourseId, setPopupCourseId] = useState<any>();
  const [isPopupActive, setIsPopupActive] = useState<boolean>();

  async function getEnrolledCourseList() {
    const sylEnrollments = await EnrollmentApi.REnrolllments({
      syllabuses: enrollments.map((e: any) => e.syllabus),
    });

    const cnt = _.countBy(
      sylEnrollments.map((enrollment: any) => enrollment.syllabus)
    );

    // enrollments to syllabus
    const syllabuses = enrollments.map((e: any) => {
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

  const showCourseDetail = (syllabusId: any) => {
    setIsPopupActive(true);
    setPopupCourseId(syllabusId);
  };

  // Get user enrollments in current season
  useEffect(() => {
    if (currentRegistration && user) {
      EnrollmentApi.REnrolllments({
        season: currentRegistration.season,
        student: user._id,
      })
        .then((res) => {
          setEnrollments(res);
        })
        .catch(() => {});
    }
  }, [currentRegistration, user]);

  // Get enrolled course
  useEffect(() => {
    if (enrollments && enrollments.length > 0) {
      getEnrolledCourseList().then((res: any) => {
        setEnrolledCourseList(structuring(res));
      });
    }
  }, [enrollments]);

  return (
    <>
      <Select
        options={[
          { text: "시간표", value: "timeTable" },
          { text: "수강신청 현황", value: "enrollments" },
          { text: "개설한 수업 목록", value: "myDesgins" },
          { text: "담당 수업 목록", value: "myCourses" },
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
        showCourseDetail={showCourseDetail}
      />
      <MyDesgins
        selected={selectedTab}
        user={user}
        showCourseDetail={showCourseDetail}
      />
      <MyCourses
        selected={selectedTab}
        user={user}
        showCourseDetail={showCourseDetail}
      />
      {popupCourseId && isPopupActive && (
        <ViewPopup course={popupCourseId} setPopupActive={setIsPopupActive} />
      )}
    </>
  );
};

const TimeTable = (props: {
  selected: string;
  enrolledCourseList: Array<any>;
}) => {
  const { currentSeason } = useAuth();

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

  if (props.selected !== "timeTable") {
    return null;
  }

  return (
    <EditorParser
      type="timetable"
      auth="view"
      defaultTimetable={syllabusToTime(props.enrolledCourseList)}
      data={currentSeason?.formTimetable}
    />
  );
};

const Enrollments = (props: {
  selected: string;
  enrolledCourseList: Array<any>;
  showCourseDetail: Function;
}) => {
  const { currentSeason } = useAuth();
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  useEffect(() => {
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
  }, [currentSeason.subjects.label]);

  if (props.selected !== "enrollments") {
    return null;
  }

  return (
    <Table
      type="object-array"
      data={props.enrolledCourseList}
      header={[
        {
          text: "No",
          type: "text",
          key: "tableRowIndex",
          width: "48px",
          textAlign: "center",
        },
        ...subjectLabelHeaderList,
        ...getSubjectHeaderList({
          onDetail: (e: any) => {
            props.showCourseDetail(e._id);
          },
        }),
      ]}
    />
  );
};

const MyDesgins = (props: {
  selected: string;
  user: any;
  showCourseDetail: Function;
}) => {
  const { SyllabusAPI } = useAPIv2();
  const { currentRegistration } = useAuth();

  const [courseList, setCourseList] = useState<any>();
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  async function getCreatedCourseList() {
    try {
      const { syllabuses } = await SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration.season,
          user: props.user._id,
        },
      });
      return syllabuses;
    } catch (err) {
      ALERT_ERROR(err);
      return [];
    }
  }

  const structuring = (courseList: any[]) => {
    return courseList.map((syllabus: any) => {
      for (
        let idx = 0;
        idx < props.user.season?.subjects?.label.length;
        idx++
      ) {
        syllabus[props.user.season?.subjects?.label[idx]] =
          syllabus.subject[idx];
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

  useEffect(() => {
    getCreatedCourseList().then((res: any) => {
      setCourseList(structuring(res));
    });
    if (props.user.season?.subjects?.label) {
      setSubjectLabelHeaderList([
        ...props.user.season?.subjects?.label.map((label: string) => {
          return {
            text: label,
            key: label,
            type: "text",
            width: "120px",
            textAlign: "center",
          };
        }),
      ]);
    }
  }, []);

  if (props.selected !== "myDesgins") {
    return null;
  }

  return (
    <Table
      control
      type="object-array"
      data={courseList}
      header={[
        {
          text: "No",
          type: "text",
          key: "tableRowIndex",
          width: "48px",
          textAlign: "center",
        },
        ...subjectLabelHeaderList,
        ...getSubjectHeaderList({
          onDetail: (e: any) => {
            props.showCourseDetail(e._id);
          },
        }),
      ]}
    />
  );
};

const MyCourses = (props: {
  selected: string;
  user: any;
  showCourseDetail: Function;
}) => {
  const { SyllabusAPI } = useAPIv2();
  const { currentRegistration } = useAuth();

  const [courseList, setCourseList] = useState<any[]>([]);
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  async function getCreatedCourseList() {
    try {
      const { syllabuses } = await SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration.season,
          teacher: props.user._id,
        },
      });
      return syllabuses;
    } catch (err) {
      ALERT_ERROR(err);
      return [];
    }
  }

  const structuring = (courseList: any[]) => {
    return courseList.map((syllabus: any) => {
      for (
        let idx = 0;
        idx < props.user.season?.subjects?.label.length;
        idx++
      ) {
        syllabus[props.user.season?.subjects?.label[idx]] =
          syllabus.subject[idx];
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

  useEffect(() => {
    getCreatedCourseList().then((res: any) => {
      setCourseList(structuring(res));
    });
    if (props.user.season?.subjects?.label) {
      setSubjectLabelHeaderList([
        ...props.user.season?.subjects?.label.map((label: string) => {
          return {
            text: label,
            key: label,
            type: "text",
            textAlign: "center",
          };
        }),
      ]);
    }
  }, []);

  if (props.selected !== "myCourses") {
    return null;
  }
  return (
    <Table
      control
      type="object-array"
      data={courseList}
      header={[
        {
          text: "No",
          type: "text",
          key: "tableRowIndex",
          width: "48px",
          textAlign: "center",
        },
        ...subjectLabelHeaderList,
        ...getSubjectHeaderList({
          onDetail: (e: any) => {
            props.showCourseDetail(e._id);
          },
        }),
      ]}
    />
  );
};

export default CoursesTab;
