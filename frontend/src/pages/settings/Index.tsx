import React from "react";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import { useAuth } from "../../contexts/authContext";
import style from "../../style/pages/settings/settings.module.scss";

type Props = {};

const Settings = (props: Props) => {
  const { currentUser } = useAuth();

  const SettingItem = () => {
    return (
      <div className={style.setting_item}>
        <div className={style.title}>이름</div>
        <input className={style.input} type="text" placeholder="이름" />
      </div>
    );
  };
  const SettingsContainer = ({
    children,
  }: {
    children: JSX.Element | JSX.Element[];
  }) => {
    return (
      <div className={style.settings_container}>
        <div className={style.container_title}>사용자 정보</div>
        {children}
      </div>
    );
  };

  return (
    <>
      <div className={style.search_container}>
        <div className={style.title}>사용자 설정</div>
        <input className={style.search} type="text" placeholder="검색" />
      </div>
      <div className={style.section}>
        <SettingsContainer>
          <SettingItem />
          <SettingItem />
          <SettingItem />
        </SettingsContainer>
      </div>
    </>
  );
};

export default Settings;
