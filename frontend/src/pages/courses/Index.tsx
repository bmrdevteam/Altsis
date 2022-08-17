import React from "react";
import Table from "../../components/table/Table";
import { courseData } from "../../dummyData/coursesData";
import style from "../../style/pages/courses/course.module.scss";

type Props = {};

const Courses = (props: Props) => {
  return (
    <div className={style.section}>
      <div className={style.title}>개설 수업 목록</div>

      <Table
        style={{ bodyHeight: "calc(100vh - 141px)" }}
        data={courseData}
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
            type: "link",
            link: "/courses",
            width: "80px",
            align: "center",
          },
        ]}
      />
    </div>
  );
};

export default Courses;
