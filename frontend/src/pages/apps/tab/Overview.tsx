import React, { useEffect, useState } from "react";
import Input from "../../../components/input/Input";
import Textarea from "../../../components/textarea/Textarea";
import { useAuth } from "../../../contexts/authContext";
import style from "../../../style/pages/settings/settings.module.scss";
import Button from "components/button/Button";
import useDatabase from "../../../hooks/useDatabase";

type Props = {}

const Overview = (props: Props) => {
  // const { currentUser, currentSchool } = useAuth();
  const database = useDatabase();
  const [InputName, setInputName] = useState<any>();
  const [InputDescription, setInputDescription] = useState<any>();

  // addclassroom function
  async function addApps() {
    await database.C({
      location: `apps/`,
      data: { 
        title: InputName,
        description: InputDescription, }
      });
  }

  async function getApps() {
    const apps = await database.R({
      location: `apps/`,
    });
    return apps;
  }

  return (
    <>
      <div style={{ gap: "12px", marginTop: "24px" }}>
        <div className={style.settings_container}>
          <div className={style.container_title}>앱 등록</div>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <Input
              label="앱 이름"
              placeholder="이름"
              appearence="flat"
              style={{ fontSize: "14px" }}
              onChange={(e: any) => {
                setInputName(e.target.value);
                console.log(e.target.value);
              }}
            />
          </div>
          <div style={{ marginTop: "12px" }}>
            <Textarea 
              label="설명" 
              placeholder="설명" 
              onChange={(e: any) => {
                setInputDescription(e.target.value);
              }}
              />
          </div>
          <div style={{ marginTop: "12px" }}>
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
              onClick={(e: any) => {
                addApps();
              }}
          > 등록 </Button>
          </div>
        </div>
      </div>
      <div style={{ gap: "12px", marginTop: "24px" }}>
        <div className={style.settings_container}>
          <div className={style.container_title}>앱 리스트</div>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          </div>
        </div>
      </div>
    </>
  );
};

export default Overview