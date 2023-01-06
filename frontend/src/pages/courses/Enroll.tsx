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
import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Input from "components/input/Input";

import ViewPopup from "./view/ViewPopup";

import _ from "lodash";
import Select from "components/select/Select";

type Props = {};

const CourseEnroll = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { currentSeason, currentUser, currentRegistration, currentPermission } =
    useAuth();

  const [searchField, setSearchField] = useState<string>("classTitle");

  const [courseTitle, setCourseTitle] = useState<string>("");

  const [courseList, setCourseList] = useState<any[]>([]);
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);
  const [course, setCourse] = useState<string>();

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);

  async function getCourseList() {
    const { syllabuses, enrollments } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}&matches=${courseTitle}&field=${searchField}&confirmed=true`,
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

  async function cancel(e: any) {
    const res = database.D({
      location: `enrollments/${e.enrollment}`,
    });
    return res;
  }

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
      text: "수강/정원",
      key: "count_limit",
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

  const searchOptions = () => {
    console.log("currentSeason: ", currentSeason);
    if (currentSeason?.subjects?.label) {
      return [
        { text: "수업명", value: "classTitle" },
        ...currentSeason.subjects.label.map((lb: string, idx: number) => {
          return { text: lb, value: `subject.${idx}` };
        }),
        { text: "시간", value: "time.label" },
        { text: "강의실", value: "classroom" },
        { text: "개설자", value: "userName" },
        { text: "멘토", value: "teachers.userName" },
      ];
    }
    return [{ text: "수업명", value: "classTitle" }];
  };

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
            };
          }),
        ]);
      }
      setIsLoading(true);
    }
  }, [currentRegistration]);

  useEffect(() => {
    console.log("currentPermission is ", currentPermission);
    if (!currentPermission.permissionEnrollment) {
      alert("수강신청 권한이 없습니다.");
      navigate("/courses");
    }
  }, [currentPermission]);

  useEffect(() => {
    if (isLoading) {
      if (courseTitle !== "") {
        getCourseList().then((res: any) => {
          setCourseList(structuring(res));
        });
      }
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
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <div style={{ width: "120px" }}>
            <Select
              appearence="flat"
              label=""
              required
              setValue={setSearchField}
              options={searchOptions()}
              defaultSelectedValue={searchField}
            />
          </div>
          <div style={{ flex: "auto" }}>
            <Input
              appearence="flat"
              required={true}
              placeholder="검색"
              onKeyDown={(e: any) => {
                if (courseTitle !== "" && e.key === "Enter") {
                  getCourseList().then((res: any) => {
                    setCourseList(structuring(res));
                  });
                }
              }}
              onChange={(e: any) => {
                setCourseTitle(e.target.value);
              }}
            />
          </div>

          <Button
            type="ghost"
            onClick={() => {
              getCourseList().then((res: any) => {
                setCourseList(structuring(res));
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
              key: "enroll",
              type: "button",
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

        <div className={style.title}>수강신청 현황</div>

        <Table
          type="object-array"
          data={enrolledCourseList}
          header={[
            {
              text: "취소",
              key: "cancel",
              type: "button",
              onClick: (e: any) => {
                cancel(e)
                  .then(() => {
                    alert("success");
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
