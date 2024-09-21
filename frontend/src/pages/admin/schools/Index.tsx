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
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import style from "style/pages/admin/schools.module.scss";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

// components
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Loading from "components/loading/Loading";
import Navbar from "layout/navbar/Navbar";
import Skeleton from "components/skeleton/Skeleton";

import { useAuth } from "contexts/authContext";
import { validate } from "functions/functions";
import { TSchool } from "types/schools";

const AddSchoolPopup = (props: {
  setPopupActive: React.Dispatch<boolean>;
  setSchoolsList: React.Dispatch<any>;
}) => {
  const { SchoolAPI } = useAPIv2();

  const inputRef = useRef<{ schoolId: string; schoolName: string }>({
    schoolId: "",
    schoolName: "",
  });

  const onClickHandler = async () => {
    if (inputRef.current.schoolId === "") {
      return alert("학교 ID를 입력해주세요");
    }
    if (!validate("schoolId", inputRef.current.schoolId)) {
      return alert("학교 ID 형식이 맞지 앉습니다");
    }
    if (inputRef.current.schoolName === "") {
      return alert("학교 이름을 입력해주세요");
    }
    if (!validate("schoolName", inputRef.current.schoolName)) {
      return alert("학교 이름 형식이 맞지 앉습니다");
    }

    try {
      const { school } = await SchoolAPI.CSchool({
        data: {
          schoolId: inputRef.current.schoolId,
          schoolName: inputRef.current.schoolName,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setSchoolsList((prev: any) => [...prev, school]);
      props.setPopupActive(false);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  return (
    <Popup setState={props.setPopupActive} closeBtn title={"학교 추가하기"}>
      <div>
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            appearence="flat"
            label="학교 ID"
            required={true}
            onChange={(e: any) => {
              inputRef.current.schoolId = e.target.value;
            }}
            placeholder="영문 소문자와 숫자로 이루어진 2~20자의 문자열"
          />
        </div>

        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          <Input
            appearence="flat"
            label="학교 이름"
            required={true}
            onChange={(e: any) => {
              inputRef.current.schoolName = e.target.value;
            }}
            placeholder="한글로 이루어진 2~20자의 문자열"
          />
        </div>

        <Button
          type={"ghost"}
          onClick={onClickHandler}
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
  );
};

const Schools = () => {
  const navigate = useNavigate();
  const { SchoolAPI } = useAPIv2();
  const { currentUser, currentSchool } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  /* document list */
  const [schoolsList, setSchoolsList] = useState<TSchool[]>([]);

  /* popup activation */
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      if (currentUser.auth === "admin") {
        SchoolAPI.RSchools().then(({ schools }) => {
          setSchoolsList(schools);
          setIsLoading(false);
        });
      } else if (currentSchool?._id) {
        navigate(`/admin/schools/${currentSchool._id}`);
      } else {
        alert("가입된 학교가 없습니다.");
        navigate("/");
      }
    }
    return () => {};
  }, [isLoading, currentSchool]);

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className={style.title}>아카데미</div>
            <div className={style.description}>
              {currentUser !== undefined ? (
                `${currentUser.academyName} / ${currentUser.academyId}`
              ) : (
                <Skeleton height="22px" width="20%" />
              )}
            </div>
          </div>
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
                text: "학교 이름",
                key: "schoolName",
                type: "text",
                textAlign: "center",
              },
              {
                text: "학교 ID",
                key: "schoolId",
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
        <AddSchoolPopup
          setPopupActive={setAddPopupActive}
          setSchoolsList={setSchoolsList}
        />
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default Schools;
