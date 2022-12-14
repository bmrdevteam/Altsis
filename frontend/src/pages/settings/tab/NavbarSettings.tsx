import React, { useState } from "react";
import Button from "components/button/Button";
import style from "style/pages/settings/settings.module.scss";
import Svg from "assets/svg/Svg";

type Props = {};

const NavbarSettings = (props: Props) => {
  const [editNavbarSeason, setEditNavbarSeason] = useState<boolean>(false);
  return (
    <>
      <div className={style.settings_container}>
        <div className={style.container_title}>내비게이션 및 사이드바 설정</div>

        <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>학기 설정</label>
            <span className={style.description}>
              내비게이션 바에 보여지는 학기를 편집
            </span>
          </div>
          <div className={style.controls} style={{ alignItems: "center" }}>
            <div
              style={{
                cursor: "pointer",
                fill: "var(--accent-3)",
                padding: "4px",
              }}
              onClick={() => {}}
            >
              <Svg type="chevronRight" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavbarSettings;
