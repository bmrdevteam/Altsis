import { useRef, useState } from "react";
import style from "style/pages/settings/settings.module.scss";
import Svg from "assets/svg/Svg";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";
import { validate } from "functions/functions";
import { useAuth } from "contexts/authContext";

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
      <div className={style.popup_content_mt}>
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

const SecuritySettings = () => {
  const [passwordEditPopupActive, setPasswordEditPopupActive] =
    useState<boolean>(false);

  return (
    <>
      <div className={style.settings_container}>
        <div className={style.container_title}>보안 설정</div>
        <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>비밀번호 재설정</label>
            <span className={style.description}>
              계정 비밀번호를 재설정 합니다
            </span>
          </div>
          <div className={`${style.controls} ${style.controls_centered}`}>
            <div
              className={style.chevron_button}
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
