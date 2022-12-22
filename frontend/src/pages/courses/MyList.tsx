/**
 * @file Courses MyList Page
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

// navigation bar
import Navbar from "layout/navbar/Navbar";

// components
import Table from "components/tableV2/Table";

import _ from "lodash";

type Props = {};

const CoursesMyList = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();

  const { currentSeason, currentUser, currentRegistration, currentPermission } =
    useAuth();

  const [courseList, setCourseList] = useState<any[]>([]);

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  async function getCreatedCourseList() {
    const { syllabuses, enrollments } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}&userId=${currentUser?.userId}`,
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
      text: "멘토",
      key: "mentorText",
      type: "string",
      textAlign: "center",
    },
    {
      text: "상태",
      key: "confirmed",
      width: "72px",
      textAlign: "center",
      type: "status",
      status: {
        false: { text: "미승인", color: "red" },
        true: { text: "승인됨", color: "green" },
      },
    },
    {
      text: "자세히",
      key: "courseName",
      type: "button",
      onClick: (e: any) => {
        navigate(`../${e._id}`, {
          replace: true,
        });
      },
      width: "80px",
      textAlign: "center",
    },
  ];

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/courses");
    } else {
      getCreatedCourseList().then((res: any) => {
        setCourseList(structuring(res));
      });
      if (currentSeason?.subjects?.label) {
        setSubjectLabelHeaderList([
          ...currentSeason?.subjects?.label.map((label: string) => {
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
    }
  }, [currentRegistration]);

  useEffect(() => {
    if (!currentPermission.permissionSyllabus) {
      alert("수업 개설 권한이 없습니다.");
      navigate("/courses");
    }
  }, [currentPermission]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>개설한 수업 목록</div>
        <div style={{ height: "24px" }}></div>

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
            ...subjectHeaderList,
          ]}
        />
      </div>
    </>
  );
};

export default CoursesMyList;
