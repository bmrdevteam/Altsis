/**
 * @file Schools Pid Page Tab Item - Season
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

import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";
import Table from "components/tableV2/Table";
import React, { useEffect, useState } from "react";
import style from "style/pages/admin/schools.module.scss";

import useApi from "hooks/useApi";

// tab
import Basic from "./tab/Basic";
import Classroom from "./tab/classrooms/Classroom";
import Form from "./tab/Form";
import Permission from "./tab/permission/PermissionV2";
import Subject from "./tab/subjects/Subject";
import Users from "./tab/users/Users";

// popup
import AddSeasonPopup from "./AddPopup";
import { TSeason } from "types/seasons";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  school: string;
  seasonList: TSeason[];
  setSeasonList: React.Dispatch<React.SetStateAction<TSeason[]>>;
};

const Season = (props: Props) => {
  const { SeasonApi } = useApi();
  const { SeasonAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  const [seasonToEdit, setSeasonToEdit] = useState<TSeason>();
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      SeasonAPI.RSeasons({ query: { school: props.school } })
        .then(({ seasons }) => {
          props.setSeasonList(seasons);
          setIsLoading(false);
        })
        .catch((err) => alert(err.response.data.message));
    }
  }, [isLoading]);

  return (
    <div className={style.seasons_tab}>
      <div style={{ height: "24px" }}></div>
      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {
          setAddPopupActive(true);
        }}
      >
        + 새로운 학기 추가
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          type="object-array"
          data={props.seasonList}
          control
          defaultPageBy={50}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "학년도",
              key: "year",
              type: "text",
              textAlign: "center",
            },
            {
              text: "학기",
              key: "term",
              type: "text",
              textAlign: "center",
            },
            {
              text: "시작",
              key: "period.start",
              textAlign: "center",
              type: "text",
              width: "120px",
            },
            {
              text: "끝",
              key: "period.end",
              type: "text",
              textAlign: "center",
              width: "120px",
            },
            {
              text: "상태",
              key: "isActivated",
              width: "120px",
              textAlign: "center",
              type: "status",
              status: {
                false: { text: "비활성화됨", color: "red" },
                true: { text: "활성화됨", color: "green" },
              },
            },
            {
              text: "자세히",
              key: "detail",
              type: "button",
              onClick: (e: any) => {
                SeasonAPI.RSeason({ params: { _id: e._id } }).then(
                  ({ season }) => {
                    setSeasonToEdit(season);
                    setEditPopupActive(true);
                  }
                );
              },
              width: "80px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "var(--accent-1)",
                padding: "4px",
                round: true,
              },
            },
          ]}
        />
      </div>

      {addPopupActive && (
        <AddSeasonPopup
          setPopupActive={setAddPopupActive}
          school={props.school}
          seasonList={props.seasonList}
          setSeasonList={props.setSeasonList}
          setSeasonToEdit={setSeasonToEdit}
          setEditPopupActive={setEditPopupActive}
        />
      )}
      {editPopupActive && seasonToEdit && (
        <Popup
          closeBtn
          title={`${seasonToEdit.year} ${seasonToEdit.term}`}
          setState={setEditPopupActive}
          style={{
            // minHeight: "620px",
            maxWidth: "800px",
            width: "100%",
          }}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": (
                <Basic
                  _id={seasonToEdit._id}
                  setPopupActive={setEditPopupActive}
                  setIsLoading={setIsLoading}
                />
              ),
              사용자: <Users seasonData={seasonToEdit} />,
              교과목: <Subject _id={seasonToEdit._id} />,
              강의실: <Classroom _id={seasonToEdit._id} />,
              양식: <Form _id={seasonToEdit._id} />,
              권한: <Permission _id={seasonToEdit._id} />,
            }}
            align={"flex-start"}
          />
        </Popup>
      )}
    </div>
  );
};

export default Season;
