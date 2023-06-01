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

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
  updateUserList: (userId: string, userData: any) => void;
};

function SnsId(props: Props) {
  const { UserAPI } = useAPIV2();
  const emailRef = useRef<string>(props.user.snsId?.google ?? "");
  const [refresh, setRefresh] = useState<boolean>(false);

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

export default SnsId;
