/**
 * @file User Edit Popup Tab Item - SnsId
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

import { useEffect, useRef, useState } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";

import useAPIV2, { ALERT_ERROR } from "hooks/useAPIv2";
import { validate } from "functions/functions";

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
};

function Auth(props: Props) {
  const { UserAPI } = useAPIV2();
  const [refresh, setRefresh] = useState<boolean>(false);

  const passwordRef = useRef<string>("");
  const emailRef = useRef<string>(props.user.snsId?.google ?? "");

  const [isPasswordInputActivated, setIsPasswordInputActivated] =
    useState<boolean>(false);

  const updatePasswordHandler = async () => {
    try {
      if (passwordRef.current.trim() === "") {
        alert("비밀번호를 입력하세요");
        return;
      }
      if (!validate("password", passwordRef.current)) {
        alert("비밀번호 형식에 맞지 않습니다.");
        return;
      }
      await UserAPI.UPasswordByAdmin({
        params: { uid: props.user._id },
        data: {
          password: passwordRef.current,
        },
      });
      alert(SUCCESS_MESSAGE);
      setIsPasswordInputActivated(false);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onClickConnectHandler = async () => {
    try {
      if (emailRef.current.trim() === "") {
        alert("이메일을 입력하세요");
        return;
      }
      const { snsId } = await UserAPI.ConnectGoogleByAdmin({
        params: { uid: props.user._id },
        data: {
          email: emailRef.current,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.user.snsId = snsId;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onClickDisconnectHandler = async () => {
    try {
      const { snsId } = await UserAPI.DisconnectGoogleByAdmin({
        params: { uid: props.user._id },
      });
      alert(SUCCESS_MESSAGE);
      props.user.snsId = snsId;
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
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "end",
          gap: "12px",
        }}
      >
        {!isPasswordInputActivated ? (
          <>
            <Input
              key="passwordInputDisabled"
              style={{ width: "200px" }}
              appearence="flat"
              label="로컬 로그인 비밀번호"
              disabled
              defaultValue="*************"
            />
            <Button
              type="ghost"
              onClick={() => setIsPasswordInputActivated(true)}
            >
              초기화
            </Button>
          </>
        ) : (
          <>
            <Input
              key="passwordInputEnabled"
              appearence="flat"
              label="로컬 로그인 비밀번호"
              onChange={(e: any) => {
                passwordRef.current = e.target.value;
              }}
              style={{ width: "360px" }}
              placeholder="특수문자(!@#$%^&*()) 하나 이상 포함하는 8~26자"
            />
            <Button type="ghost" onClick={updatePasswordHandler}>
              수정
            </Button>
            <Button
              type="ghost"
              onClick={() => {
                passwordRef.current = "";
                setIsPasswordInputActivated(false);
              }}
            >
              취소
            </Button>
          </>
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
          label="구글 로그인"
          defaultValue={props.user.snsId?.google ?? ""}
          onChange={(e: any) => {
            emailRef.current = e.target.value;
          }}
          placeholder="example@gmail.com"
        />
        {!props.user.snsId?.google ? (
          <Button type="ghost" onClick={onClickConnectHandler}>
            등록
          </Button>
        ) : (
          <Button type="ghost" onClick={onClickDisconnectHandler}>
            삭제
          </Button>
        )}
      </div>
    </div>
  ) : (
    <></>
  );
}

export default Auth;
