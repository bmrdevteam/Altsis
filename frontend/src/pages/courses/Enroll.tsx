/**
 * @file Enrollment Index Page
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
import useApi from "hooks/useApi";

import style from "style/pages/enrollment.module.scss";

// Navigation Bar
import Navbar from "layout/navbar/Navbar";

// components
import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Input from "components/input/Input";

import ViewPopup from "./view/ViewPopup";

import _ from "lodash";
import Select from "components/select/Select";

type Props = {};

const CourseEnroll = (props: Props) => {
  const navigate = useNavigate();
  const { SyllabusApi, EnrollmentApi } = useApi();

  const { currentSeason, currentUser, currentRegistration, currentPermission } =
    useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [courseList, setCourseList] = useState<any[]>([]);
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);
  const [course, setCourse] = useState<string>();

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);

  async function getCourseList() {
    const { syllabuses, enrollments } = await SyllabusApi.RSyllabuses({
      season: currentRegistration.season,
      confirmed: true,
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

  async function getEnrolledCourseList() {
    const myEnrollments = await EnrollmentApi.REnrolllments({
      season: currentRegistration?.season,
      student: currentUser?._id,
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
      text: "자세히",
      key: "detail",
      type: "button",
      onClick: (e: any) => {
        setCourse(e._id);
        setViewPopupActive(true);
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
      setIsLoading(true);
    }
  }, [currentRegistration]);

  useEffect(() => {
    if (currentPermission && !currentPermission.permissionEnrollment) {
      alert("수강신청 권한이 없습니다.");
      navigate("/courses");
    }
  }, [currentPermission]);

  useEffect(() => {
    if (isLoading) {
      getCourseList().then((res: any) => {
        setCourseList(_.sortBy(structuring(res), ["subject", "title"]));
      });
      getEnrolledCourseList().then((res: any) => {
        setEnrolledCourseList(structuring(res));
      });
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수강신청</div>

        <div style={{ marginTop: "24px" }} />
        <Table
          type="object-array"
          data={courseList}
          control
          header={[
            {
              text: "신청",
              key: "enroll",
              type: "button",
              onClick: (e: any) => {
                EnrollmentApi.CEnrollment({
                  data: {
                    syllabus: e._id,
                    registration: currentRegistration?._id,
                  },
                })
                  .then(() => {
                    alert(SUCCESS_MESSAGE);
                    setIsLoading(true);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              },
              width: "72px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "green",
                padding: "4px",
                round: true,
              },
            },
            ...subjectLabelHeaderList,
            ...subjectHeaderList,
          ]}
        />

        <div style={{ height: "24px" }}></div>
        <Divider />
        <div style={{ height: "24px" }}></div>

        <div className={style.title}>수강 현황</div>

        <Table
          type="object-array"
          data={enrolledCourseList}
          header={[
            {
              text: "취소",
              key: "cancel",
              type: "button",
              onClick: (e: any) => {
                EnrollmentApi.DEnrollment(e.enrollment)
                  .then(() => {
                    alert(SUCCESS_MESSAGE);
                    setIsLoading(true);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              },
              width: "72px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "red",
                padding: "4px",
                round: true,
              },
            },
            ...subjectLabelHeaderList,
            ...subjectHeaderList,
          ]}
        />
      </div>
      {viewPopupActive && course && (
        <ViewPopup course={course} setPopupActive={setViewPopupActive} />
      )}
    </>
  );
};

export default CourseEnroll;
