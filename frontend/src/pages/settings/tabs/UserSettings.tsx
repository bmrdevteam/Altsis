import React from "react";
import Divider from "../../../components/divider/Divider";
import Input from "../../../components/input/Input";
import Textarea from "../../../components/textarea/Textarea";
import { useAuth } from "../../../contexts/authContext";
import style from "../../../style/pages/settings/settings.module.scss";

type Props = {};

const UserSettings = (props: Props) => {
    const {currentUser} = useAuth()
  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>사용자 정보</div>
      <div>
        <img src="" alt="" />
      </div>
      <div style={{ display: "flex" ,gap:"12px"}}>
        <Input
          label="이름"
          placeholder="이름"
          inputStyle="flat"
          style={{ fontSize: "14px" }}
          defaultValue={currentUser.userName}
        />
        <Input
          label="아이디"
          placeholder="아이디"
          inputStyle="flat"
          style={{ fontSize: "14px" }}
          defaultValue={currentUser.userId}
          disabled
        />
      </div>
      <div style={{marginTop:"12px"}}>
        <Textarea label="설명" placeholder="설명"/>
      </div>
    </div>
  );
};

export default UserSettings;
