/**
 * @file User Edit Popup Tab Item - Basic
 *
 * @author jessie129j <jessie129j@gmail.com>
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

import { useState, useRef, useEffect } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Select from "components/select/Select";

import useAPIV2, { ALERT_ERROR } from "hooks/useAPIv2";
import { validate } from "functions/functions";

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
};

function Basic(props: Props) {
  const { UserAPI } = useAPIV2();
  const [refresh, setRefresh] = useState<boolean>(false);
  const userNameRef = useRef<string>(props.user.userName ?? "");
  const emailRef = useRef<string>(props.user.email ?? "");
  const telRef = useRef<string>(props.user.tel ?? "");
  const birthdayRef = useRef<string>(
    props.user.birthday ? new Date(props.user.birthday).toISOString().split("T")[0] : ""
  );
  const addressRef = useRef<string>(props.user.address ?? "");

  const onUpdateAuthHandler = async (value: "admin" | "member" | "manager") => {
    try {
      if (props.user.auth === value) return;
      const { auth } = await UserAPI.UUserAuth({
        params: { uid: props.user._id },
        data: {
          auth: value,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.auth = auth;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onUpdateUserNameHandler = async () => {
    try {
      if (props.user.userName === userNameRef.current) return;
      if (userNameRef.current === "") {
        alert("이름을 입력해주세요.");
        return;
      }
      if (!validate("userName", userNameRef.current)) {
        alert("이름 형식에 맞지 않습니다.");
        return;
      }
      const { userName } = await UserAPI.UUserName({
        params: { uid: props.user._id },
        data: {
          userName: userNameRef.current,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.userName = userName;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onUpdateEmailHandler = async () => {
    try {
      if (props.user.email === emailRef.current) return;
      if (emailRef.current !== "" && !validate("email", emailRef.current)) {
        alert("이메일 형식에 맞지 않습니다.");
        return;
      }
      const { email } = await UserAPI.UUserEmail({
        params: { uid: props.user._id },
        data: {
          email: emailRef.current !== "" ? emailRef.current : undefined,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.email = email;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onUpdateTelHandler = async () => {
    try {
      if (props.user.tel === telRef.current) return;
      if (telRef.current !== "" && !validate("tel", telRef.current)) {
        alert("전화번호 형식에 맞지 않습니다.");
        return;
      }
      const { tel } = await UserAPI.UUserTel({
        params: { uid: props.user._id },
        data: {
          tel: telRef.current !== "" ? telRef.current : undefined,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.tel = tel;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onUpdateBirthdayHandler = async () => {
    try {
      const currentBirthday = props.user.birthday
        ? new Date(props.user.birthday).toISOString().split("T")[0]
        : "";
      if (currentBirthday === birthdayRef.current) return;
      const { birthday } = await UserAPI.UUserBirthday({
        params: { uid: props.user._id },
        data: {
          birthday: birthdayRef.current !== "" ? birthdayRef.current : undefined,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.birthday = birthday;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onUpdateAddressHandler = async () => {
    try {
      if (props.user.address === addressRef.current) return;
      const { address } = await UserAPI.UUserAddress({
        params: { uid: props.user._id },
        data: {
          address: addressRef.current !== "" ? addressRef.current : undefined,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.address = address;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onUpdateGenderHandler = async (value: "male" | "female" | "") => {
    try {
      const currentGender = props.user.gender ?? "";
      if (currentGender === value) return;
      const { gender } = await UserAPI.UUserGender({
        params: { uid: props.user._id },
        data: {
          gender: value !== "" ? value : undefined,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.gender = gender;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
    }
  }, [refresh]);

  return !refresh ? (
    <div className={style.popup}>
      <div style={{ marginTop: "24px" }}>
        <Select
          appearence="flat"
          label="등급"
          required
          options={[
            { text: "멤버", value: "member" },
            { text: "매니저", value: "manager" },
            { text: "관리자", value: "admin" },
          ]}
          defaultSelectedValue={props.user.auth}
          onChange={onUpdateAuthHandler}
        />
      </div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "end",
          gap: "12px",
        }}
      >
        <Input
          appearence="flat"
          label="이름"
          defaultValue={props.user.userName ?? ""}
          onChange={(e: any) => {
            userNameRef.current = e.target.value;
          }}
        />
        <Button type="ghost" onClick={onUpdateUserNameHandler}>
          수정
        </Button>
      </div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "end",
          gap: "12px",
        }}
      >
        <Input
          appearence="flat"
          label="이메일"
          defaultValue={props.user.email ?? ""}
          onChange={(e: any) => {
            emailRef.current = e.target.value;
          }}
        />
        <Button type="ghost" onClick={onUpdateEmailHandler}>
          수정
        </Button>
      </div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "end",
          gap: "12px",
        }}
      >
        <Input
          appearence="flat"
          label="전화번호"
          defaultValue={props.user.tel ?? ""}
          onChange={(e: any) => {
            telRef.current = e.target.value;
          }}
        />
        <Button type="ghost" onClick={onUpdateTelHandler}>
          수정
        </Button>
      </div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "end",
          gap: "12px",
        }}
      >
        <Input
          appearence="flat"
          label="생년월일"
          type="date"
          defaultValue={
            props.user.birthday
              ? new Date(props.user.birthday).toISOString().split("T")[0]
              : ""
          }
          onChange={(e: any) => {
            birthdayRef.current = e.target.value;
          }}
        />
        <Button type="ghost" onClick={onUpdateBirthdayHandler}>
          수정
        </Button>
      </div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "end",
          gap: "12px",
        }}
      >
        <Input
          appearence="flat"
          label="주소"
          defaultValue={props.user.address ?? ""}
          onChange={(e: any) => {
            addressRef.current = e.target.value;
          }}
        />
        <Button type="ghost" onClick={onUpdateAddressHandler}>
          수정
        </Button>
      </div>
      <div style={{ marginTop: "24px" }}>
        <Select
          appearence="flat"
          label="성별"
          options={[
            { text: "", value: "" },
            { text: "남성", value: "male" },
            { text: "여성", value: "female" },
          ]}
          defaultSelectedValue={props.user.gender ?? ""}
          onChange={onUpdateGenderHandler}
        />
      </div>
    </div>
  ) : (
    <></>
  );
}

export default Basic;
