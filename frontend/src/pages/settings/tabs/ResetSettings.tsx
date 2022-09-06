import React from "react";
import Button from "../../../components/button/Button";
import style from "../../../style/pages/settings/settings.module.scss";

type Props = {};

const ResetSettings = (props: Props) => {
  
  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>설정</div>

      <div className={style.setting_item}>
        <div className={style.info}>
          <label className={style.label}>모든 설정 초기화</label>
          <span className={style.description}>
            모든 설정을 초기로 되돌립니다 (유저 정보제외)
          </span>
        </div>
        <div className={style.controls} style={{ alignItems: "center" }}>
          <Button
            type={"ghost"}
            styles={{
              borderRadius: "4px",
              height: "32px",
              background: "var(--color-r3)",
              color: "var(--accent-6)",
              fontWeight: 600,
            }}
          >
            초기화
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetSettings;
