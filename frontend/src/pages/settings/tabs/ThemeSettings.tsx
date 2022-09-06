import React from "react";
import Input from "../../../components/input/Input";
import Textarea from "../../../components/textarea/Textarea";
import { useAuth } from "../../../contexts/authContext";
import style from "../../../style/pages/settings/settings.module.scss";

type Props = {};

const ThemeSettings = (props: Props) => {
  const { currentUser } = useAuth();
  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>테마</div>
      <div className={style.settings_item}>
        <label>다크모드</label>
      </div>
    </div>
  );
};

export default ThemeSettings;
