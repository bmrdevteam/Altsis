/**
 * @file Settings Page tab - SocialLoginSettings
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * 
 * - SocialLoginSettings Page
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
 */


import Svg from "assets/svg/Svg";
import Button from "components/button/Button";
import { useAuth } from "contexts/authContext";
import style from "style/pages/settings/settings.module.scss";

type Props = {};

const SocialLoginSettings = (props: Props) => {
  const { currentUser } = useAuth();
  console.log("🚀 ~ file: SocialLoginSettings.tsx ~ line 40 ~ SocialLoginSettings ~ currentUser", currentUser)
  
  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>소셜 로그인 연동</div>
      {currentUser.snsId?.map((value: any, index: number) => {
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
            <div className={style.icon}>
              <Svg type="google" width="26px" height="26px"/>
            </div>
            <div className={style.info}>
              <label className={style.label}>{value.provider}</label>
              <span className={style.description}>{value.email}</span>
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
        style={{
          borderRadius: "4px",
          height: "32px",
        }}
      >
        연동하기
      </Button>
    </div>
  );
};

export default SocialLoginSettings;
