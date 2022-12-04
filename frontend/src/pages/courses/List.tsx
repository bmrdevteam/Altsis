import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "components/table/Table";
import useDatabase from "hooks/useDatabase";
import style from "style/pages/courses/course.module.scss";
import { useAuth } from "contexts/authContext";
import Navbar from "layout/navbar/Navbar";

type Props = {};

const CourseList = (props: Props) => {
  const { currentRegistration } = useAuth();

  const database = useDatabase();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<any[]>([]);

  async function getCourseList() {
    const { syllabuses: res } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}`,
    });
    return res;
  }
  useEffect(() => {
    getCourseList().then((res) => {
      setCourses(res);
    });
  }, [currentRegistration]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>개설 수업 목록</div>

        <Table
          type="object-array"
          style={{ bodyHeight: "calc(100vh - 141px)" }}
          data={courses}
          header={[
            {
              text: "수업 명",
              key: "courseName",
              type: "string",
            },
            {
              text: "과목",
              key: "subject",
              type: "string",
              width: "240px",
            },
            {
              text: "선생님",
              key: "teachers",
              type: "string",
              width: "180px",
            },
            {
              text: "강의실",
              key: "classroom",
              type: "string",
              width: "120px",
            },
            {
              text: "자세히",
              key: "_id",
              type: "button",
              onClick: (e: any) => {
                navigate(`${e.target.dataset.value}`, {
                  replace: true,
                });
              },

              width: "80px",
              align: "center",
            },
          ]}
        />
      </div>
    </>
  );
};

export default CourseList;
