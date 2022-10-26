/**
 * @file Settings Index Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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
import style from "../../style/pages/settings/settings.module.scss";
import ResetSettings from "./tab/ResetSettings";
import SchoolSettings from "./tab/SchoolSettings";
import SecuritySettings from "./tab/SecuritySettings";
import SocialLoginSettings from "./tab/SocialLoginSettings";
import ThemeSettings from "./tab/ThemeSettings";
import UserSettings from "./tab/UserSettings";

type Props = {};

const Settings = (props: Props) => {



  return (
    <>
      <div className={style.search_container}>
        <div className={style.title}>사용자 설정</div>
        <input className={style.search} type="text" placeholder="검색" />
      </div>
      <div className={style.section}>
         <UserSettings/>
         <SocialLoginSettings/>
         <SecuritySettings/>
         <SchoolSettings/>
         <ThemeSettings/>
         <ResetSettings/>
      </div>
    </>
  );
};

export default Settings;
