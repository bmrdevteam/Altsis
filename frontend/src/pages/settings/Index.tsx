import React from "react";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import { useAuth } from "../../contexts/authContext";
import style from "../../style/pages/settings/settings.module.scss";

type Props = {};

const Settings = (props: Props) => {
  const { currentUser } = useAuth();
  return (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>설정</div>
      <div className={style.user_container}>
        <div className={style.username}>{currentUser.userName}</div>
      </div>
    </div>
  );
};

export default Settings;
