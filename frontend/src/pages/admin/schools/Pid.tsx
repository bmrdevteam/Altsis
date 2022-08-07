import React, { useEffect } from "react";
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
  const navigate = useNavigate();

  useEffect(() => {
    navigate("#기본 정보");
    //get school from backend

    return () => {};
  }, []);

  //if the user cannot locate the school using the id return "CannotFindSchool" page

  if (false) {
    return <CannotFindSchool schoolId={pid} />;
  }

  return (
    <div className={style.section}>
      <NavigationLinks />

      <div className={style.title}>{pid}</div>

      <Tab
        items={{
          "기본 정보": <BasicInfo />,
          학기: <Season />,
          교과목: <Subject />,
          강의실: <Classroom />,
          양식: <Form />,
        }}
      />
    </div>
  );
};

export default School;
