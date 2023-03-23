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
import useApi from "hooks/useApi";
import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import { useAuth } from "contexts/authContext";
import { validate } from "functions/functions";
import Navbar from "layout/navbar/Navbar";
import Loading from "components/loading/Loading";

const Schools = () => {
  const navigate = useNavigate();
  const { SchoolApi } = useApi();
  const { currentUser, currentSchool } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /* document list */
  const [schoolsList, setSchoolsList] = useState<any>();

  /* popup activation */
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  /* document fields */
  const [schoolId, setSchoolId] = useState<string>();
  const [schoolName, setSchoolName] = useState<string>();

  useEffect(() => {
    // console.log("test");
    if (currentUser.auth === "admin") {
      setIsAuthenticated(true);
      setIsLoading(true);
    } else if (currentSchool) {
      // console.log("currentSchol is ", currentSchool);
      navigate(`/admin/schools`);
    } else {
      alert("가입된 학교가 없습니다.");
      navigate("/");
    }
    return () => {};
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) {
      SchoolApi.RSchools().then((res) => {
        setSchoolsList(res);
        setIsLoading(false);
      });
    }
    return () => {};
  }, [isLoading]);

  return isAuthenticated ? (
    <>
      <Navbar />
      <div className={style.section}>
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
            data={!isLoading ? schoolsList : []}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "학교 ID",
                key: "schoolId",
                type: "text",
                textAlign: "center",
              },
              {
                text: "학교명",
                key: "schoolName",
                type: "text",
                textAlign: "center",
              },
              {
                text: "자세히",
                key: "detail",
                type: "button",
                onClick: (value: any) => {
                  navigate(`/admin/schools/${value._id}`);
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "black",
                  padding: "4px",
                  round: true,
                },
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
                if (schoolId && schoolName) {
                  SchoolApi.CSchools({ data: { schoolId, schoolName } })
                    .then(() => {
                      alert("성공적으로 처리되었습니다. 😘💌");
                      setAddPopupActive(false);
                      setIsLoading(true);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }
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
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default Schools;
