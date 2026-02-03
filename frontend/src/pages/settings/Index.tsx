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
import style from "style/pages/settings/settings.module.scss";
import NavbarSettings from "./tab/NavbarSettings";
import NotificationSettings from "./tab/NotificationSettings";
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
      <div className={style.section}>
        <UserSettings />
        <SocialLoginSettings />
        <SecuritySettings />
        <NotificationSettings />
        <SchoolSettings />
        <ThemeSettings />
        {/* <NavbarSettings/> */}
        {/* <ResetSettings /> */}
      </div>
    </>
  );
};

export default Settings;
