import Svg from "assets/svg/Svg";
import { useAuth } from "contexts/authContext";
import style from "style/pages/settings/settings.module.scss";

const SocialLoginSettings = () => {
  const { currentUser } = useAuth();

  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>소셜 로그인 연동</div>
      <div className={`${style.setting_item} ${style.setting_item_card}`}>
        <div className={style.icon}>
          <Svg type="google" width="26px" height="26px" />
        </div>
        <div className={style.info}>
          <label className={style.label}>{"google"}</label>
          <span className={style.description}>
            {currentUser?.snsId?.google}
          </span>
        </div>
        <div className={style.controls}></div>
      </div>
    </div>
  );
};

export default SocialLoginSettings;
