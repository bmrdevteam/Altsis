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
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Table from "components/table/Table";
import useDatabase from "hooks/useDatabase";
import style from "style/pages/admin/schools.module.scss";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";

const Schools = () => {
  const navigate = useNavigate();
  const database = useDatabase();

  const [isLoading, setIsLoading] = useState(true);

  /* document list */
  const [schoolsList, setSchoolsList] = useState<any>();

  /* popup activation */
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  /* document fields */
  const [schoolId, setSchoolId] = useState<string>();
  const [schoolName, setSchoolName] = useState<string>();

  async function getSchoolList() {
    const { schools: res } = await database.R({ location: "schools" });
    setSchoolsList(res);
  }

  useEffect(() => {
    if (isLoading) {
      getSchoolList().then(() => {
        setIsLoading(false);
      });
    }
    return () => {};
  }, [isLoading]);

  async function addSchool() {
    const result = await database.C({
      location: `schools`,
      data: {
        schoolId,
        schoolName,
      },
    });
    return result;
  }

  return (
    <>
      {" "}
      <div className={style.section}>
        <NavigationLinks />
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>학교 목록</div>
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
          onClick={(e: any) => {
            setAddPopupActive(true);
          }}
        >
          + 학교 추가
        </Button>
        <div style={{ marginTop: "24px" }}>
          <Table
            type="object-array"
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
                text: "자세히",
                key: "_id",
                type: "button",
                onClick: (value: any) => {
                  navigate(`${value._id}`);
                },
                width: "80px",
                align: "center",
              },
            ]}
          />
        </div>
      </div>
      {addPopupActive && (
        <Popup
          setState={setAddPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"학교 추가하기"}
        >
          <div>
            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="schoolId"
                required={true}
                onChange={(e: any) => {
                  setSchoolId(e.target.value);
                }}
                placeholder="2~20자의 영문 소문자와 숫자만 가능합니다."
              />
            </div>

            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="schoolName"
                required={true}
                onChange={(e: any) => {
                  setSchoolName(e.target.value);
                }}
                placeholder="2~20자의 문자만 가능합니다."
              />
            </div>

            <Button
              type={"ghost"}
              onClick={() => {
                addSchool()
                  .then((res) => {
                    alert("success");
                    setAddPopupActive(false);
                    setIsLoading(true);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
              }}
            >
              추가
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Schools;
