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
  const emailRef = useRef<string>(props.user.email ?? "");
  const telRef = useRef<string>(props.user.tel ?? "");

  const onUpdateAuthHandler = async (value: "member" | "manager") => {
    try {
      if (props.user.auth === value) return;
      const { auth } = await UserAPI.UAuthByAdmin({
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

  const onUpdateEmailHandler = async () => {
    try {
      if (props.user.email === emailRef.current) return;
      if (!validate("email", emailRef.current)) {
        alert("이메일 형식에 맞지 않습니다.");
        return;
      }
      const { email } = await UserAPI.UEmailByAdmin({
        params: { uid: props.user._id },
        data: {
          email: emailRef.current,
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
      if (!validate("tel", telRef.current)) {
        alert("전화번호 형식에 맞지 않습니다.");
        return;
      }
      const { tel } = await UserAPI.UTelByAdmin({
        params: { uid: props.user._id },
        data: {
          tel: telRef.current,
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

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
    }
  }, [refresh]);

  return !refresh ? (
    <div className={style.popup}>
      <div style={{ marginTop: "24px" }}>
        {props.user.auth !== "admin" ? (
          <Select
            appearence="flat"
            label="등급"
            required
            options={[
              { text: "멤버", value: "member" },
              { text: "매니저", value: "manager" },
            ]}
            defaultSelectedValue={props.user.auth}
            onChange={onUpdateAuthHandler}
          />
        ) : (
          <Select
            appearence="flat"
            label="등급"
            options={[{ text: "관리자", value: "admin" }]}
          />
        )}
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
    </div>
  ) : (
    <></>
  );
}

export default Basic;
