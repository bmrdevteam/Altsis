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

import React, { useState } from "react";
import style from "style/pages/settings/settings.module.scss";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Svg from "assets/svg/Svg";
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";

type Props = {};

const SecuritySettings = (props: Props) => {
  const [resetPasswordPopupActive, setResetPasswordPopupActive] =
    useState<boolean>(false);
  return (
    <>
      <div className={style.settings_container}>
        <div className={style.container_title}>보안 설정</div>
        <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>이 기기에서 로그인 기억 하기</label>
          </div>
          <div className={style.controls}>
            <ToggleSwitch />
          </div>
        </div>
        <Divider />
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
        {/* <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>비밀번호 재설정 요청</label>
            <span className={style.description}>
              관리자에게 비밀번호 재설정 요청
            </span>
          </div>
          <div className={style.controls} style={{ alignItems: "center" }}>
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
              }}
            >
              보내기
            </Button>
          </div>
        </div> */}
      </div>
      {resetPasswordPopupActive && (
        <Popup
          borderRadius={"8px"}
          title="비밀번호 재설정"
          setState={setResetPasswordPopupActive}
          closeBtn
          footer={<Button type="ghost">비밀번호 변경</Button>}
        >
          <div style={{ width: "500px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="기존 비밀번호 입력"
              placeholder="기존 비밀번호 입력"
              type="password"
            />
            <div style={{ margin: "24px" }}></div>
            <Input
              appearence="flat"
              label="새로운 비밀번호 입력"
              placeholder="새로운 비밀번호 입력"
              type="password"
            />
          </div>
        </Popup>
      )}
    </>
  );
};

export default SecuritySettings;
