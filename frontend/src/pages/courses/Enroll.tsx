/**
 * @file Course Enroll Page
 * @page 수강 신청 페이지
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

// Navigation Bar
import Navbar from "layout/navbar/Navbar";

// components
import Divider from "components/divider/Divider";

import _ from "lodash";

import CourseTable from "./table/CourseTable";
import Loading from "components/loading/Loading";
type Props = {};

const CourseEnroll = (props: Props) => {
  const navigate = useNavigate();
  const { SyllabusApi, EnrollmentApi } = useApi();

  const { currentSeason, currentUser, currentRegistration, currentPermission } =
    useAuth();

  const [isLoadingCourseList, setIsLoadingCourseList] = useState<boolean>(true);
  const [courseList, setCourseList] = useState<any[]>([]);

  const [isLoadingEnrolledCourseList, setIsLoadingEnrolledCourseList] =
    useState<boolean>(true);
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);

  async function getCourseList() {
    const { syllabuses, enrollments } = await SyllabusApi.RSyllabuses({
      season: currentRegistration?.season,
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

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    } else {
      setIsLoadingCourseList(true);
      setIsLoadingEnrolledCourseList(true);
    }
  }, [currentRegistration]);

  useEffect(() => {
    if (currentPermission && !currentPermission.permissionEnrollment) {
      alert("수강신청 권한이 없습니다.");
      navigate("/courses");
    }
  }, [currentPermission]);

  useEffect(() => {
    if (isLoadingCourseList) {
      getCourseList().then((res: any) => {
        setCourseList(res);
        setIsLoadingCourseList(false);
      });
    }
  }, [isLoadingCourseList]);

  useEffect(() => {
    if (isLoadingEnrolledCourseList) {
      getEnrolledCourseList().then((res: any) => {
        setEnrolledCourseList(res);
        setIsLoadingEnrolledCourseList(false);
      });
    }
  }, [isLoadingEnrolledCourseList]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수강신청</div>
        {!isLoadingCourseList ? (
          <CourseTable
            data={courseList}
            subjectLabels={currentSeason?.subjects?.label ?? []}
            preHeaderList={[
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
                      setIsLoadingCourseList(true);
                      setIsLoadingEnrolledCourseList(true);
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
            ]}
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <Divider />
      </div>
      <div className={style.section}>
        <div className={style.title}>수강 현황</div>
        {!isLoadingEnrolledCourseList ? (
          <CourseTable
            data={enrolledCourseList}
            subjectLabels={currentSeason?.subjects?.label ?? []}
            preHeaderList={[
              {
                text: "취소",
                key: "cancel",
                type: "button",
                onClick: (e: any) => {
                  EnrollmentApi.DEnrollment(e.enrollment)
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      setIsLoadingCourseList(true);
                      setIsLoadingEnrolledCourseList(true);
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
            ]}
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
    </>
  );
};

export default CourseEnroll;
