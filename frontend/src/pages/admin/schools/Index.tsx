import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/button/Button";
import NavigationLinks from "../../../components/navigationLinks/NavigationLinks";
import Table from "../../../components/table/Table";
import useDatabase from "../../../hooks/useDatabase";
import style from "../../../style/pages/admin/schools/schools.module.scss";

const Schools = () => {
  const navigate = useNavigate();
  const database = useDatabase();

  const [schoolsList, setSchoolsList] = useState();
  const [isLoading, setIsLoading] = useState(true);

  async function getSchoolList() {
    const { schools: res } = await database.R({ location: "schools/list" });
    setSchoolsList(res);
  }
  useEffect(() => {
    getSchoolList().then(() => {
      setIsLoading(false);
    });
    return () => {};
  }, []);

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
          data={!isLoading ? schoolsList : []}
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
              key: "_id",
              type: "button",
              onClick: (e: any) => {
                navigate(`${e.target.dataset.value}`);
              },
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
