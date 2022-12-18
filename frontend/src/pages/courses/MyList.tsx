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
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import Button from "components/button/Button";

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

  const labelling = (courseList: any[]) => {
    return courseList.map((syllabus: any) => {
      for (let idx = 0; idx < currentSeason?.subjects?.label.length; idx++) {
        syllabus[currentSeason?.subjects?.label[idx]] = syllabus.subject[idx];
      }
      return syllabus;
    });
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
      text: "상태",
      key: "teachers",
      returnFunction: (e: any) => {
        for (let teacher of e) {
          if (!teacher.confirmed) return "미승인";
        }
        return "승인됨";
      },
      type: "string",
      width: "120px",
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
      align: "center",
    },
  ];

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/courses");
    } else {
      getCreatedCourseList().then((res: any) => {
        setCourseList(labelling(res));
      });
      if (currentSeason?.subjects?.label) {
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
          filter
          type="object-array"
          data={courseList}
          header={[...subjectLabelHeaderList, ...subjectHeaderList]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />
      </div>
    </>
  );
};

export default CoursesMyList;
