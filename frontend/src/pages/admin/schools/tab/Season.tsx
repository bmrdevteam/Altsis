import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../../../components/button/Button";
import Input from "../../../../components/input/Input";
import Popup from "../../../../components/popup/Popup";
import Table from "../../../../components/table/Table";
import useDatabase from "../../../../hooks/useDatabase";
import style from "../../../../style/pages/admin/schools/schools.module.scss";

type Props = {};

const Season = (props: Props) => {
  const navigate = useNavigate();
  const database = useDatabase();
  const {pid} = useParams();
  console.log(pid);

  async function getSeasons() {
    const result = await database.R({ location: `seasons/${pid}` });
    return result;
  }

  useEffect(() => {
    getSeasons();
  }, []);

  const [addSeasonPopupActive, setAddSeasonPopupActive] =
    useState<boolean>(false);
  return (
    <div className={style.seasons_tab}>
      <div style={{ height: "24px" }}></div>
      <Button
        type={"ghost"}
        styles={{
          borderRadius: "4px",
          height: "32px",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {
          setAddSeasonPopupActive(true);
        }}
      >
        + 새로운 학기 추가
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          data={[]}
          header={[
            {
              text: "ID",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            {
              text: "학교 ID",
              key: "schoolId",
              type: "string",
            },
            {
              text: "학교명",
              key: "schoolName",
              type: "string",
            },
            {
              text: "학생수",
              key: "userCount",
              type: "string",
            },
            {
              text: "자세히",
              key: "_id",
              type: "button",
              onClick: (e: any) => {
                navigate(`/admin/schools/${e.target.dataset.value}`, {
                  replace: true,
                });
              },
              width: "80px",
              align: "center",
            },
          ]}
        />
      </div>

      {addSeasonPopupActive && (
        <Popup
          setState={setAddSeasonPopupActive}
          style={{ borderRadius: "8px", maxWidth: "800px", width: "100%" }}
          closeBtn
          title={"학기"}
        >
          <div className={style.popup}>
            <div style={{ height: "24px" }}></div>

            <Input inputStyle="flat" label="학기 이름" required />
            <Input inputStyle="flat" label="학기 이름" required />
          </div>
          <div style={{ height: "24px" }}></div>
          <Button
            type={"ghost"}
            styles={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            저장
          </Button>
        </Popup>
      )}
    </div>
  );
};

export default Season;
