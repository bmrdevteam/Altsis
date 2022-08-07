import { useNavigate } from "react-router-dom";
import Button from "../../../components/button/Button";
import NavigationLinks from "../../../components/navigationLinks/NavigationLinks";
import Table from "../../../components/table/Table";
import style from "../../../style/pages/admin/schools/schools.module.scss";



const Schools = () => {
  const navigate = useNavigate();

  return (
    <div className={style.section}>
      <NavigationLinks />

      <div className={style.title}>학교 명단</div>
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "rgb(225,225,225)",
          margin: "12px 0",
        }}
      ></div>
      <Button
        type={"ghost"}
        borderRadius={"4px"}
        height={"32px"}
        onClick={() => {
          navigate("add", { replace: true });
        }}
      >
        + 학교추가
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          data={[
            {
              id: "j23htjnasdbd34",
              schoolId: "bmrhs",
              schoolName: "별무리고등학교",
              userCount: 134,
            },
            {
              id: "2135ljh312bdas",
              schoolId: "bmrms",
              schoolName: "별무리중학교",
              userCount: 153,
            },
          ]}
          header={[
            {
              text: "ID",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "학교 ID",
              key: "schoolId",
              type: "string",
            },
            {
              text: "학교명",
              key: "schoolName",
              type: "string",
            },
            {
              text: "학생수",
              key: "userCount",
              type: "string",
            },
            {
              text: "자세히",
              key: "schoolId",
              type: "link",
              link: "/academy/schools",
              width: "80px",
              align: "center",
            },
          ]}
          style={{ backgroundColor: "#fff" }}
        />
      </div>
    </div>
  );
};

export default Schools;
