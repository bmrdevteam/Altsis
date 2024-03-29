/**
 * @file User Page Tab Item - Basic
 *
 * @author jessie129j <jessie129j@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------

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

import { useState, useEffect, useRef } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";
import Popup from "components/popup/Popup";

import _ from "lodash";
import Table from "components/tableV2/Table";
import Textarea from "components/textarea/Textarea";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { validate } from "functions/functions";

type Props = {
  setPopupAcitve: any;
  addUserList: (users: any[]) => void;
  setUser: React.Dispatch<any>;
  setEditPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
};

type TSchool = {
  _id: string;
  schoolId: string;
  schoolName: string;
};

type TUserSchool = {
  school: string;
  schoolId: string;
  schoolName: string;
};

type TInput = {
  auth: "member" | "manager";
  userId: string;
  userName: string;
  password: string;
  email: string;
  tel: string;
  snsId: {
    google: string;
  };
};

function Add(props: Props) {
  const { UserAPI, SchoolAPI } = useAPIv2();

  const [isLoadingSchools, setIsLoadingSchools] = useState<boolean>(true);
  const [schoolList, setSchoolList] = useState<TSchool[]>([]);

  /* user fields */
  const selectedSchoolTextRef = useRef<string>("");

  const [schools, setSchools] = useState<TUserSchool[]>([]);
  const inputRef = useRef<TInput>({
    auth: "member",
    userId: "",
    userName: "",
    password: "",
    email: "",
    tel: "",
    snsId: {
      google: "",
    },
  });

  const addUserSchoolHandler = () => {
    if (selectedSchoolTextRef.current === "") return;

    const { _id, schoolId, schoolName } = JSON.parse(
      selectedSchoolTextRef.current
    );
    if (_.find(schools, (_school) => _school.school === _id)) return;

    setSchools([...schools, { school: _id, schoolId, schoolName }]);
  };

  const removeUserSchoolHandler = (sid: string) => {
    const idx = _.findIndex(schools, (_school) => _school.school === sid);
    if (idx !== -1) {
      schools.splice(idx, 1);
      setSchools([...schools]);
    }
  };

  async function addUserHandler() {
    const auth = inputRef.current.auth;
    const userId = inputRef.current.userId.trim();
    const userName = inputRef.current.userName.trim();
    const password = inputRef.current.password.trim();
    const tel =
      inputRef.current.tel.trim() !== ""
        ? inputRef.current.tel.trim()
        : undefined;
    const email =
      inputRef.current.email.trim() !== ""
        ? inputRef.current.email.trim()
        : undefined;
    const snsId = {
      google:
        inputRef.current.snsId.google.trim() !== ""
          ? inputRef.current.snsId.google.trim()
          : undefined,
    };

    /* validate */

    // validate userId
    if (userId === "") {
      return alert("ID를 입력해주세요");
    }
    if (!validate("userId", userId)) {
      return alert("ID가 형식에 맞지 않습니다");
    }

    // validate userName
    if (userName === "") {
      return alert("이름를 입력해주세요");
    }
    if (!validate("userName", userName)) {
      return alert("이름이 형식에 맞지 않습니다");
    }

    // validate password
    if (password === "") {
      return alert("비밀번호를 입력해주세요");
    }
    if (!validate("password", password)) {
      return alert("비밀번호가 형식에 맞지 않습니다");
    }

    // validate email
    if (email && !validate("email", email)) {
      return alert("이메일이 형식에 맞지 않습니다");
    }

    // validate tel
    if (tel && !validate("tel", tel)) {
      return alert("전화번호가 형식에 맞지 않습니다");
    }

    // validate snsId
    if (snsId.google && !validate("email", snsId.google)) {
      return alert("구글 로그인 이메일이 형식에 맞지 않습니다");
    }

    try {
      const { user } = await UserAPI.CUser({
        data: {
          schools,
          auth,
          userId,
          userName,
          password,
          tel,
          email,
          snsId,
        },
      });

      alert(SUCCESS_MESSAGE);
      props.addUserList([user]);
      props.setUser(user);
      props.setPopupAcitve(false);
      props.setEditPopupActive(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  }

  useEffect(() => {
    if (isLoadingSchools) {
      SchoolAPI.RSchools()
        .then(({ schools }) => {
          setSchoolList(schools);
        })
        .then(() => setIsLoadingSchools(false))
        .catch((err: any) => alert(err.response.data.message));
    }
  }, [isLoadingSchools]);

  return (
    <Popup
      setState={props.setPopupAcitve}
      style={{ maxWidth: "480px", width: "100%" }}
      closeBtn
      title="사용자 단일 생성"
      contentScroll
    >
      <div className={style.popup}>
        <div style={{ display: "flex", alignItems: "end", gap: "12px" }}>
          <Select
            appearence="flat"
            label="소속 학교"
            options={[
              { text: "", value: "" },
              ...schoolList.map((_school) => {
                return {
                  text: `${_school.schoolName}(${_school.schoolId})`,
                  value: JSON.stringify({
                    _id: _school._id,
                    schoolId: _school.schoolId,
                    schoolName: _school.schoolName,
                  }),
                };
              }),
            ]}
            onChange={(e: string) => {
              selectedSchoolTextRef.current = e;
            }}
          />
          <Button type="ghost" onClick={addUserSchoolHandler}>
            등록
          </Button>
        </div>
        <div style={{ marginTop: "12px" }}>
          <Table
            type="object-array"
            data={schools}
            header={[
              {
                text: "No",
                key: "tableRowIndex",
                type: "text",
                textAlign: "center",
                width: "20px",
              },
              {
                text: "학교 이름",
                key: "schoolName",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                width: "140px",
                type: "text",
              },
              {
                text: "학교 ID",
                key: "schoolId",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                width: "140px",
                type: "text",
              },
              {
                text: "삭제",
                key: "delete",
                type: "button",
                onClick: (e: any) => {
                  removeUserSchoolHandler(e.school);
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "red",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "24px",
            flexDirection: "column",
          }}
        >
          <Select
            style={{ minHeight: "30px" }}
            label="등급"
            required
            options={[
              { text: "멤버", value: "member" },
              { text: "매니저", value: "manager" },
            ]}
            setValue={(e: "member" | "manager") => (inputRef.current.auth = e)}
            appearence={"flat"}
          />
          <Input
            key="userId"
            appearence="flat"
            label="ID"
            required={true}
            onChange={(e: any) => {
              inputRef.current.userId = e.target.value;
            }}
            placeholder="알파벳, 숫자로 이루어진 길이 4~20의 문자열"
          />
          <Input
            appearence="flat"
            label="이름"
            required={true}
            onChange={(e: any) => {
              inputRef.current.userName = e.target.value;
            }}
            placeholder="알파벳, 숫자, 한글로 이루어진 길이 2~20의 문자열"
          />
          <Input
            appearence="flat"
            label="비밀번호"
            required={true}
            onChange={(e: any) => {
              inputRef.current.password = e.target.value;
            }}
            placeholder="특수문자(!@#$%^&*())가 하나 이상 포함된 길이 8~26의 문자열"
          />
          <Input
            appearence="flat"
            label="이메일"
            onChange={(e: any) => {
              inputRef.current.email = e.target.value;
            }}
          />
          <Input
            appearence="flat"
            label="구글 로그인 이메일"
            onChange={(e: any) => {
              inputRef.current.snsId.google = e.target.value;
            }}
          />
          <Input
            appearence="flat"
            label="전화번호"
            onChange={(e: any) => {
              inputRef.current.tel = e.target.value;
            }}
          />
        </div>

        <Button
          type={"ghost"}
          onClick={addUserHandler}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            marginTop: "24px",
          }}
        >
          생성
        </Button>
      </div>
    </Popup>
  );
}

export default Add;
