/**
 * @file Settings Page tab - SecuritySettings
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - SecuritySettings Page
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * - change password btn onclick function
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import { useRef, useState } from "react";
import style from "style/pages/settings/settings.module.scss";
import Svg from "assets/svg/Svg";

// hooks
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

// functions

// components
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";
import { validate } from "functions/functions";
import { useAuth } from "contexts/authContext";

type Props = {};

const PasswordEditPopup = (props: {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { UserAPI } = useAPIv2();

  const { currentUser } = useAuth();

  const passwordRef = useRef<string>("");

  const updateHandler = async () => {
    try {
      if (
        passwordRef.current !== "" &&
        !validate("password", passwordRef.current)
      ) {
        return alert(
          "비밀번호는 특수문자(!@#$%^&*())가 하나 이상 포함된 길이 8~26의 문자열이어야 합니다."
        );
      }

      await UserAPI.UUserPassword({
        params: { uid: currentUser._id },
        data: {
          password: passwordRef.current,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setPopupActive(false);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  return (
    <Popup
      title="비밀번호 재설정"
      setState={props.setPopupActive}
      closeBtn
      footer={
        <Button type="ghost" onClick={updateHandler}>
          비밀번호 재설정
        </Button>
      }
    >
      <div style={{ width: "500px", marginTop: "24px" }}>
        {/* <Input
        appearence="flat"
        label="기존 비밀번호 입력"
        placeholder="기존 비밀번호 입력"
        type="password"
        onChange={(e: any) => {
          setOldPassword(e.target.value);
        }}
        required
      />
      <div style={{ margin: "24px" }}></div> */}
        <Input
          appearence="flat"
          label="새로운 비밀번호 입력"
          placeholder="특수문자(!@#$%^&*())가 하나 이상 포함된 길이 8~26의 문자열"
          type="password"
          onChange={(e: any) => {
            passwordRef.current = e.target.value;
          }}
          required
        />
      </div>
    </Popup>
  );
};

const SecuritySettings = (props: Props) => {
  const [passwordEditPopupActive, setPasswordEditPopupActive] =
    useState<boolean>(false);

  return (
    <>
      <div className={style.settings_container}>
        <div className={style.container_title}>보안 설정</div>
        {/* <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>이 기기에서 로그인 기억 하기</label>
          </div>
          <div className={style.controls}>
            <ToggleSwitch />
          </div>
        </div>
        <Divider /> */}
        <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>비밀번호 재설정</label>
            <span className={style.description}>
              계정 비밀번호를 재설정 합니다
            </span>
          </div>
          <div className={style.controls} style={{ alignItems: "center" }}>
            <div
              style={{
                cursor: "pointer",
                fill: "var(--accent-3)",
                padding: "4px",
              }}
              onClick={() => {
                setPasswordEditPopupActive(true);
              }}
            >
              <Svg type="chevronRight" />
            </div>
          </div>
        </div>
      </div>
      {passwordEditPopupActive && (
        <PasswordEditPopup setPopupActive={setPasswordEditPopupActive} />
      )}
    </>
  );
};

export default SecuritySettings;
