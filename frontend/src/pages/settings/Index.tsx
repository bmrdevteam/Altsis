import React from "react";
import Input from "../../components/input/Input";
import Textarea from "../../components/textarea/Textarea";
import { useAuth } from "../../contexts/authContext";
import style from "../../style/pages/settings/settings.module.scss";
import ThemeSettings from "./tabs/ThemeSettings";
import UserSettings from "./tabs/UserSettings";

type Props = {};

const Settings = (props: Props) => {
  const { currentUser } = useAuth();


  return (
    <>
      <div className={style.search_container}>
        <div className={style.title}>사용자 설정</div>
        <input className={style.search} type="text" placeholder="검색" />
      </div>
      <div className={style.section}>
         <UserSettings/>
         <ThemeSettings/>
      </div>
    </>
  );
};

export default Settings;
