/**
 * @file Schools Index Page
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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/button/Button";
import Divider from "../../../components/divider/Divider";
import NavigationLinks from "../../../components/navigationLinks/NavigationLinks";
import Table from "../../../components/table/Table";
import useDatabase from "../../../hooks/useDatabase";
import style from "../../../style/pages/admin/schools/schools.module.scss";

const Schools = () => {
  const navigate = useNavigate();
  const database = useDatabase();

  const [schoolsList, setSchoolsList] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);

  async function getSchoolList() {
    const { schools: res } = await database.R({ location: "schools" });
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
      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ flex: "1 1 0" }}>
          <div className={style.title}>학교 명단</div>
          <div className={style.description}>
            학교는 교육과정을 다루기 적합한 곳입니다
          </div>
        </div>
        {/* <Button
          type={"ghost"}
          borderRadius={"4px"}
          height={"32px"}
          onClick={() => {
            navigate("add", { replace: true });
          }}
        >
          + 학교추가
        </Button> */}
      </div>
      <Divider />
      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {
          navigate("add", { replace: true });
        }}
      >
        + 학교추가
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          filter
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
        />
      </div>
    </div>
  );
};

export default Schools;
