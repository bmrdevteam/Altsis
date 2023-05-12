import Button from "components/button/Button";
import React, { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import Table from "components/table/Table";
import style from "style/pages/myaccount/myaccount.module.scss";
import useDatabase from "hooks/useDatabase";
import useApi from "hooks/useApi";

const Overview = () => {
  const { currentUser, currentSeason } = useAuth();
  const { EnrollmentApi } = useApi();
  const database = useDatabase();
  const [Enrollments, setEnrollments] = useState<any>();
  const [courses, setCourses] = useState<any>();
  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (currentSeason === null || currentSeason === undefined) {
      setAlertPopupActive(true);
    } else {
      EnrollmentApi.REnrolllments({
        season: currentSeason._id,
        student: currentUser._id,
      }).then((res) => {
        setEnrollments(res);
      });
    }
  }, [currentSeason]);
  // 테스트
  async function getCourseList() {
    const { syllabuses: res } = await database.R({
      location: `syllabuses?season=${currentSeason._id}&userId=${currentUser.userId}`,
    });
    return res;
  }
  useEffect(() => {
    if (currentSeason === null || currentSeason === undefined) {
      setAlertPopupActive(true);
    } else {
      getCourseList().then((res) => {
        setCourses(res);
      });
    }
  }, [currentSeason]);

  // console.log(currentUser);
  // console.log(currentSeason);
  // console.log(Enrollments);
  return (
    <div>
      <div className={style.settings_container}>
        <div className={style.container_title}>사용자 정보</div>
        <div
          style={{
            display: "flex",
            flexFlow: "row wrap",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexGrow: "1",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            이름
          </div>
          <div
            style={{
              display: "flex",
              flexGrow: "1",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {currentUser.userName}
          </div>
          <div
            style={{
              display: "flex",
              flexGrow: "1",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            직위
          </div>
          <div
            style={{
              display: "flex",
              flexGrow: "1",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {currentUser.auth}
          </div>
          <div
            style={{
              display: "flex",
              flexGrow: "1",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            이메일
          </div>
          <div
            style={{
              display: "flex",
              flexGrow: "1",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {currentUser?.email}
          </div>
          <Button
            type={"ghost"}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              flexGrow: "1",
            }}
            onClick={() => {}}
          >
            시간표
          </Button>
        </div>
      </div>
      <div className={style.settings_container}>
        <div className={style.container_title}>
          수강신청현황 [{currentSeason.year} {currentSeason.term}]
        </div>
        <Table
          type="object-array"
          data={Enrollments}
          header={[
            {
              text: "id",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "교과",
              key: "subject",
              type: "string",
              align: "left",
            },
            {
              text: "수업명",
              key: "classTitle",
              type: "string",
              align: "left",
            },
            {
              text: "학점",
              key: "point",
              type: "string",
              align: "left",
              width: "100px",
            },
            {
              text: "교사",
              key: "teachers",
              returnFunction: (e: any) => {
                let result = e.map((val: any) => val.userName);
                return result;
              },
              onClick: (value) => {
                // console.log(value);
              },
              type: "string",
              align: "left",
              width: "100px",
            },
            {
              text: "시간",
              key: "time",
              returnFunction: (e: any) => {
                let result = e.map((val: any) => val.label);
                return result;
              },
              onClick: (value) => {
                // console.log(value);
              },
              type: "string",
              align: "left",
              width: "100px",
            },
          ]}
        />
      </div>
      <div className={style.settings_container}>
        <div className={style.container_title}>
          수업개설현황 [{currentSeason.year} {currentSeason.term}]
        </div>
        <Table
          type="object-array"
          data={courses}
          header={[
            {
              text: "id",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "교과",
              key: "subject",
              type: "string",
              align: "left",
            },
            {
              text: "수업명",
              key: "classTitle",
              type: "string",
              align: "left",
            },
            {
              text: "학점",
              key: "point",
              type: "string",
              align: "left",
              width: "100px",
            },
            {
              text: "교사",
              key: "teachers",
              returnFunction: (e: any) => {
                let result = e.map((val: any) => val.userName);
                return result;
              },
              onClick: (value) => {
                // console.log(value);
              },
              type: "string",
              align: "left",
              width: "100px",
            },
            {
              text: "시간",
              key: "time",
              returnFunction: (e: any) => {
                let result = e.map((val: any) => val.label);
                return result;
              },
              onClick: (value) => {
                // console.log(value);
              },
              type: "string",
              align: "left",
              width: "100px",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Overview;
