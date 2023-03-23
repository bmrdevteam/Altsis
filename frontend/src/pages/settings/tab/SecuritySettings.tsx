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

import { useState } from "react";
import style from "style/pages/settings/settings.module.scss";
import Svg from "assets/svg/Svg";

// hooks
import useDatabase from "hooks/useDatabase";

// functions

// components
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";
import { validate } from "functions/functions";

type Props = {};

const SecuritySettings = (props: Props) => {
  const database = useDatabase();

  const [resetPasswordPopupActive, setResetPasswordPopupActive] =
    useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");

  async function updatePassword() {
    const res = database.U({
      location: `users/password`,
      data: {
        // old: oldPassword,
        new: newPassword,
      },
    });
    return res;
  }

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
                setResetPasswordPopupActive(true);
              }}
            >
              <Svg type="chevronRight" />
            </div>
          </div>
        </div>
      </div>
      {resetPasswordPopupActive && (
        <Popup
          borderRadius={"8px"}
          title="비밀번호 재설정"
          setState={setResetPasswordPopupActive}
          closeBtn
          footer={
            <Button
              type="ghost"
              onClick={() => {
                if (!validate("password", newPassword)) {
                  alert(
                    "비밀번호는 특수문자(!@#$%^&*())가 하나 이상 포함된 길이 8~26의 문자열이어야 합니다."
                  );
                } else {
                  updatePassword()
                    .then((res) => {
                      alert("success");
                      setResetPasswordPopupActive(false);
                    })
                    .catch((err: any) => alert(err.response.data.message));
                }
              }}
            >
              비밀번호 변경
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
                setNewPassword(e.target.value);
              }}
              required
            />
          </div>
        </Popup>
      )}
    </>
  );
};

export default SecuritySettings;
