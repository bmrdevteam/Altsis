/**
 * @file Courses List Page
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

const Courses = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();

  const { currentSeason, currentRegistration } = useAuth();

  const [courseList, setCourseList] = useState<any[]>([]);

  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);

  /* subject label header list */
  const [subjectLabelHeaderList, setSubjectLabelHeaderList] = useState<any[]>(
    []
  );

  async function getCreatedCourseList() {
    const { syllabuses, enrollments } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}`,
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
      setAlertPopupActive(true);
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

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>개설된 수업 목록</div>
        <div style={{ height: "24px" }}></div>

        <Table
          filter
          type="object-array"
          data={courseList}
          header={[...subjectLabelHeaderList, ...subjectHeaderList]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />
      </div>

      {alertPopupActive && (
        <Popup setState={() => {}} title="가입된 시즌이 없습니다">
          <div style={{ marginTop: "12px" }}>
            <Button
              type="ghost"
              onClick={() => {
                navigate("/");
              }}
            >
              메인 화면으로 돌아가기
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Courses;
