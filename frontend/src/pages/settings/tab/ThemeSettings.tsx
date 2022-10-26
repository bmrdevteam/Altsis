/**
 * @file Settings Page tab - ThemeSettings
 * 
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * 
 * - ThemeSettings Page
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

import ToggleSwitch from "../../../components/toggleSwitch/ToggleSwitch";
import { useAuth } from "../../../contexts/authContext";
import { useTheme } from "../../../contexts/themeContext";
import style from "../../../style/pages/settings/settings.module.scss";

type Props = {};

const ThemeSettings = (props: Props) => {
  const { currentUser } = useAuth();
  const { setDefaultAppTheme, darkModeActive } = useTheme();

  
  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>테마</div>
      <div className={style.setting_item}>
        <div className={style.info}>
          <label className={style.label}>다크모드</label>
          <span className={style.description}>
            사이트의 테마를 다크모드로 설정 합니다
          </span>
        </div>
        <div className={style.controls}>
          <ToggleSwitch
            defaultChecked={darkModeActive}
            onChange={(e: any) => {
              setDefaultAppTheme(e.target.checked ? "dark" : "light");
            }}
          />
        </div>
      </div>
      <div className={style.setting_item}>
        <div className={style.info}>
          <label className={style.label}>기기의 테마를 따라가기</label>
          <span className={style.description}>
            사이트의 테마를 기기의 테마의 따라서 설정 합니다
          </span>
        </div>
        <div className={style.controls}>
          <ToggleSwitch />
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
