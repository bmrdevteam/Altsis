import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import style from "../../../style/pages/admin/schools/schools.module.scss";

// NavigationLinks component
import NavigationLinks from "../../../components/navigationLinks/NavigationLinks";

// tab component
import Tab from "../../../components/tab/Tab";

// tab elements
import BasicInfo from "./tab/BasicInfo";
import Classroom from "./tab/Classroom";
import Season from "./tab/Season";
import Subject from "./tab/Subject";
import Form from "./tab/Form";
import useDatabase from "../../../hooks/useDatabase";
import Setting from "./tab/Setting";

type Props = {};

const CannotFindSchool = ({ schoolId }: { schoolId?: string }) => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      <div style={{ textAlign: "center" }}>
        학교<strong>{schoolId}</strong>
        를 찾을 수 없습니다 <br />
        <span
          style={{ cursor: "pointer" }}
          onClick={() => {
            navigate("/academy/schools/add", { replace: true });
          }}
        >
          학교 추가하기
        </span>
      </div>
    </div>
  );
};

const School = (props: Props) => {
  const { pid } = useParams<"pid">();

  const database = useDatabase();

  const [schoolData, setSchoolData] = useState<any>();
  const [resetSchoolData, setResetSchoolData] = useState<boolean>(true);
  const [schoolsList, setSchoolsList] = useState<any>([]);
  const [isSchool, setIsSchool] = useState<boolean>(true);

  async function getSchoolList() {
    const { schools: res } = await database.R({ location: "schools/list" });
    setSchoolsList(res);
    return res;
  }

  useEffect(() => {
    if (resetSchoolData) {
      getSchoolList().then((res) => {
        if (res.filter((val: any) => val._id === pid).length === 0) {
          setIsSchool(false);
        }
        setSchoolData(res.filter((val: any) => val._id === pid)[0]);
      });
      console.log("reset");

      setResetSchoolData(false);
    }
    return () => {};
  }, [resetSchoolData]);

  if (!isSchool) {
    return <CannotFindSchool />;
  }
  return (
    <div className={style.section}>
      <NavigationLinks />

      <div className={style.title}>
        {schoolData !== undefined && schoolData.schoolName}
      </div>

      <Tab
        items={{
          "기본 정보": <BasicInfo school={schoolData} />,
          학기: <Season />,
          교과목: <Subject school={schoolData} />,
          강의실: (
            <Classroom school={schoolData} resetData={setResetSchoolData} />
          ),
          "양식(beta)": <Form />,
          "설정(test)": <Setting />,
        }}
      />
    </div>
  );
};

export default School;
