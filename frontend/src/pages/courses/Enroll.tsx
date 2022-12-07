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

import style from "style/pages/enrollment.module.scss";

// Navigation Bar
import Navbar from "layout/navbar/Navbar";

// components
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Input from "components/input/Input";

import _ from "lodash";

type Props = {};

const CourseEnroll = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const {
    currentSeason,
    currentUser,
    currentRegistration,
    changeCurrentSeason,
  } = useAuth();

  const [courseTitle, setCourseTitle] = useState<string>("");

  const [courseList, setCourseList] = useState<any[]>([]);
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);

  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  async function getCourseList() {
    const { syllabuses, enrollments } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}&matches=${courseTitle}&confirmed=true`,
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
    const { enrollments: myEnrollments } = await database.R({
      location: `enrollments?season=${currentRegistration?.season}&studentId=${currentUser?.userId}`,
    });
    if (myEnrollments.length === 0) return [];

    const { enrollments: sylEnrollments } = await database.R({
      location: `enrollments?syllabuses=${_.join(
        myEnrollments.map((e: any) => e.syllabus),
        ","
      )}`,
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

  const labelling = (courseList: any[]) => {
    return courseList.map((syllabus: any) => {
      for (let idx = 0; idx < currentSeason?.subjects?.label.length; idx++) {
        syllabus[currentSeason?.subjects?.label[idx]] = syllabus.subject[idx];
      }
      return syllabus;
    });
  };

  async function enroll(e: any) {
    const res = database.C({
      location: "enrollments",
      data: {
        syllabus: e._id,
        registration: currentRegistration?._id,
      },
    });
    return res;
  }

  async function cancle(e: any) {
    const res = database.D({
      location: `enrollments/${e.enrollment}`,
    });
    return res;
  }

  const checkPermission = () => {
    const permission = currentSeason?.permissionEnrollment;
    for (let i = 0; i < permission?.length; i++) {
      if (
        permission[i][0] === "userId" &&
        permission[i][1] === currentUser?.userId
      ) {
        return permission[i][2];
      }
      if (
        permission[i][0] === "role" &&
        permission[i][1] === currentRegistration?.role
      )
        return permission[i][2];
    }
    return false;
  };

  const subjectHeaderList = [
    {
      text: "수업명",
      key: "classTitle",
      type: "string",
    },

    {
      text: "시간",
      key: "time",
      type: "string",
      returnFunction: (e: any) =>
        _.join(
          e.map((timeBlock: any) => timeBlock.label),
          ", "
        ),
    },
    {
      text: "강의실",
      key: "classroom",
      type: "string",
      width: "120px",
    },

    {
      text: "학점",
      key: "point",
      type: "string",
      width: "80px",
    },
    {
      text: "수강/정원",
      key: "count_limit",
      type: "string",
      width: "80px",
    },
    {
      text: "개설자",
      key: "userName",
      type: "string",
      width: "120px",
    },
    {
      text: "멘토",
      key: "teachers",
      returnFunction: (e: any) => {
        return _.join(
          e.map((teacher: any) => {
            return teacher.userName;
          }),
          ", "
        );
      },
      type: "string",
      width: "120px",
    },
    {
      text: "자세히",
      key: "courseName",
      type: "button",
      onClick: (e: any) => {
        navigate(`../courses/${e._id}`, {
          replace: true,
        });
      },
      width: "80px",
      align: "center",
    },
  ];

  useEffect(() => {
    if (!currentRegistration) {
      setAlertMessage("등록된 학기가 없습니다.");
      setAlertPopupActive(true);
    } else if (!checkPermission()) {
      setAlertMessage("수강신청 권한이 없습니다.");
      setAlertPopupActive(true);
    } else {
      setSubjectLabelHeaderList([
        ...currentSeason?.subjects?.label.map((label: string) => {
          return {
            text: label,
            key: label,
            type: "string",
            width: "120px",
          };
        }),
      ]);
      setIsLoading(true);
    }
  }, [currentRegistration]);

  useEffect(() => {
    if (isLoading) {
      if (!currentRegistration) {
        setAlertPopupActive(true);
      } else {
        if (courseTitle !== "") {
          getCourseList().then((res: any) => {
            setCourseList(labelling(res));
          });
        }
        getEnrolledCourseList().then((res: any) => {
          setEnrolledCourseList(labelling(res));
        });
      }
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수강신청</div>
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            appearence="flat"
            required={true}
            placeholder="검색"
            onKeyDown={(e: any) => {
              if (courseTitle !== "" && e.key === "Enter") {
                getCourseList().then((res: any) => {
                  setCourseList(labelling(res));
                });
              }
            }}
            onChange={(e: any) => {
              setCourseTitle(e.target.value);
            }}
          />
          <Button
            type="ghost"
            onClick={() => {
              getCourseList().then((res: any) => {
                setCourseList(labelling(res));
              });
            }}
          >
            검색
          </Button>
        </div>

        <div style={{ marginTop: "24px" }} />
        <Table
          type="object-array"
          data={courseList}
          header={[
            {
              text: "신청",
              key: "_id",
              onClick: (e: any) => {
                enroll(e)
                  .then(() => {
                    alert("success");
                    setIsLoading(true);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              },
              type: "button",
              width: "80px",
              align: "center",
              textStyle: {
                padding: "0 10px",
                border: "var(--border-default)",
                background: "rgba(200, 200, 255, 0.25)",
                borderColor: "rgba(200, 200, 255)",
              },
            },
            ...subjectLabelHeaderList,
            ...subjectHeaderList,
          ]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />

        <div style={{ height: "24px" }}></div>
        <Divider />
        <div style={{ height: "24px" }}></div>

        <div className={style.title}>수강신청 현황</div>

        <Table
          filter
          type="object-array"
          data={enrolledCourseList}
          header={[
            {
              text: "취소",
              key: "_id",
              onClick: (e: any) => {
                cancle(e)
                  .then(() => {
                    alert("success");
                    setIsLoading(true);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              },
              type: "button",
              width: "80px",
              align: "center",
              textStyle: {
                padding: "0 10px",
                border: "var(--border-default)",
                background: "rgba(200, 200, 255, 0.25)",
                borderColor: "rgba(200, 200, 255)",
              },
            },
            ...subjectLabelHeaderList,
            ...subjectHeaderList,
          ]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />
      </div>

      {alertPopupActive && (
        <Popup setState={setAlertPopupActive} title={alertMessage}>
          <div style={{ marginTop: "24px" }}>
            <Button
              type="ghost"
              onClick={() => {
                setAlertPopupActive(false);
              }}
            >
              확인
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default CourseEnroll;
