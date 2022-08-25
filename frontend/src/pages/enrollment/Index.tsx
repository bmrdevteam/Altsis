import React, { useEffect } from "react";
import Divider from "../../components/divider/Divider";
import Input from "../../components/input/Input";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import Select from "../../components/select/Select";
import Table from "../../components/table/Table";
import { courseData } from "../../dummyData/coursesData";
import useDatabase from "../../hooks/useDatabase";
import useSearch from "../../hooks/useSearch";
import style from "../../style/pages/enrollment.module.scss";

type Props = {};

const Enrollment = (props: Props) => {
  const search = useSearch(courseData);
  const database = useDatabase();

  function handleTableOnClick(e: any) {
    console.log(e.target.dataset.value);
  }

  async function getCourseList() {
    const res = await database.R({ location: "api/syllabuses/list?" });

    // setCourseList(res);
    return res;
  }
  useEffect(() => {
    getCourseList().then((res) => {
      console.log(res);
    });
    return () => {};
  }, []);

  return (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>수강신청</div>

      <div className={style.search_container}>
        <Input
          placeholder={"수업명으로 검색"}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            search.addFilterItem({
              id: "courseName",
              key: "courseName",
              operator: "=",
              value: e.target.value,
            });
            console.log(e.target.value);
          }}
        />
        <div style={{ height: "8px" }}></div>
        <div style={{ display: "flex" }}>
          <Select
            options={[
              { text: "", value: "" },
              { text: "월", value: "mon" },
              { text: "화", value: "tue" },
              { text: "수", value: "wed" },
              { text: "목", value: "thur" },
              { text: "금", value: "fri" },
              { text: "토", value: "sat" },
              { text: "일", value: "sun" },
            ]}
          />
          <Select
            options={[
              { text: "", value: "" },
              { text: "수학", value: "mon" },
              { text: "영어", value: "tue" },
              { text: "국어", value: "wed" },
              { text: "체육", value: "thur" },
              { text: "미술", value: "fri" },
              { text: "외국어 1", value: "sat" },
              { text: "외국어 2", value: "sun" },
            ]}
          />
          <Select
            options={[
              { text: "", value: "" },
              { text: "1 학점", value: "mon" },
              { text: "2 학점", value: "tue" },
              { text: "3 학점", value: "wed" },
              { text: "4 학점", value: "thur" },
              { text: "5 학점", value: "fri" },
              { text: "6 학점", value: "sat" },
            ]}
          />
        </div>
      </div>
      <Divider />
      <Table
        data={search.result()}
        header={[
          {
            text: "신청",
            key: "subject",
            onClick: handleTableOnClick,
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
        style={{ backgroundColor: "#fff", bodyHeight: "calc(100vh - 300px)" }}
      />
    </div>
  );
};

export default Enrollment;
