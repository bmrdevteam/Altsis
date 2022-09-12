/**
 * @file SchoolSettings Page
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - SchoolSettings Page
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * - delete school and add school function
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

import React from "react";
import Svg from "../../../assets/svg/Svg";
import Button from "../../../components/button/Button";
import { useAuth } from "../../../contexts/authContext";
import style from "../../../style/pages/settings/settings.module.scss";

type Props = {};

const SchoolSettings = (props: Props) => {
  const { schoolUsers } = useAuth();
  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>등록된 학교</div>
      {schoolUsers?.map((value: any, index: number) => {
        return (
          <div
            key={index}
            className={style.setting_item}
            style={{
              padding: "12px 16px",
              border: "var(--border-default)",
              borderRadius: "8px",
            }}
          >
            <div className={style.info}>
              <label className={style.label}>{value?.schoolName}</label>
              <span className={style.description}>{value?.role}</span>
            </div>
            <div
              className={style.controls}
              style={{ alignItems: "flex-start", cursor: "pointer" }}
            >
              <div style={{}}>
                <Svg type="verticalDots" />
              </div>
            </div>
          </div>
        );
      })}
      <Button
        type={"ghost"}
        styles={{
          borderRadius: "4px",
          height: "32px",
        }}
      >
        새로 등록하기
      </Button>
    </div>
  );
};

export default SchoolSettings;
