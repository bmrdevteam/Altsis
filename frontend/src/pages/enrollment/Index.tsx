/**
 * @file Enrollment Index Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Input from "components/input/Input";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Table from "components/table/Table";
import { useAuth } from "contexts/authContext";
import { courseData } from "dummyData/coursesData";
import useDatabase from "hooks/useDatabase";
import useSearch from "hooks/useSearch";
import style from "style/pages/enrollment.module.scss";
import Nav from "layout/sidebar/sidebar.components";
import Navbar from "layout/navbar/Navbar";

type Props = {};

const Enrollment = (props: Props) => {
  const { registrations, currentRegistration } = useAuth();
  const database = useDatabase();
  const navigate = useNavigate();
  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);
  const [courses, setCourses] = useState<any[]>([]);
  function handleTableOnClick(e: any) {
    console.log(e.target.dataset.value);
  }

  async function getCourseList() {
    const { syllabuses: res } = await database.R({
      location: `syllabuses?season=${currentRegistration?.season}`,
    });
    return res;
  }
  useEffect(() => {
    if (registrations.length <= 0) {
      console.log("no season", registrations);  

      setAlertPopupActive(true);
    } else {
      getCourseList().then((res) => {
        setCourses(res);
      });
    }
  }, [currentRegistration]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수강신청</div>
        <div style={{ height: "24px" }}></div>

        <Table
          data={courses}
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
              key: "classTitle",
              type: "string",
            },
            {
              text: "과목",
              key: "subject",
              returnFunction: (e: any) => {
                let result = e.map((val: any) => val);
                return result;
              },
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
              text: "멘토",
              key: "teachers",
              returnFunction: (e: any) => {
                let result = e.map((val: any) => val.userName);
                return result;
              },
              onClick: (value) => {
                console.log(value);
              },
              type: "string",
              width: "120px",
            },
            {
              text: "자세히",
              key: "courseName",
              type: "button",
              onClick: (e: any) => {
                navigate(`courses/${e.target.dataset.value}`, {
                  replace: true,
                });
              },
              width: "80px",
              align: "center",
            },
          ]}
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

export default Enrollment;
