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
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";
import Tab from "components/tab/Tab";
import Table from "components/tableV2/Table";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Tree from "components/tree/Tree";
import useDatabase from "hooks/useDatabase";
import style from "style/pages/admin/schools.module.scss";

import useApi from "hooks/useApi";

// tab
import Basic from "./tab/Basic";
import Classroom from "./tab/classrooms/Classroom";
import Form from "./tab/Form";
import Permission from "./tab/Permission";
import Subject from "./tab/subjects/Subject";
import Users from "./tab/users/Users";

type Props = { schoolData: any };

const Season = (props: Props) => {
  const { SeasonApi } = useApi();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [seasons, setSeasons] = useState<any[]>();
  const [selectedSeason, setSelectedSeason] = useState<any>();

  const [year, setYear] = useState();
  const [term, setTerm] = useState<string>();
  const [start, setStart] = useState<string>();
  const [end, setEnd] = useState<string>();

  const [addSeasonPopupActive, setAddSeasonPopupActive] =
    useState<boolean>(false);
  const [editSeasonPopupActive, setEditSeasonPopupActive] =
    useState<boolean>(false);

  useEffect(() => {
    if (isLoading) {
      SeasonApi.RSeasons({ school: props.schoolData._id })
        .then((res) => {
          setSeasons(res);
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
          setAddSeasonPopupActive(true);
        }}
      >
        + 새로운 학기 추가
      </Button>
      <div style={{ marginTop: "24px" }}>
        <Table
          type="object-array"
          data={
            seasons?.sort((a, b) => {
              return (
                new Date(b.period?.start).getTime() -
                new Date(a.period?.start).getTime()
              );
            }) ?? []
          }
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
                SeasonApi.RSeason(e._id).then((res) => {
                  setSelectedSeason(res);
                  setEditSeasonPopupActive(true);
                });
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

      {addSeasonPopupActive && (
        <Popup
          setState={setAddSeasonPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"학기 추가"}
        >
          <div>
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="학년도"
                required={true}
                onChange={(e: any) => {
                  setYear(e.target.value);
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <Input
                style={{ maxHeight: "30px" }}
                appearence="flat"
                label="학기"
                onChange={(e: any) => {
                  setTerm(e.target.value);
                }}
                required
              />
            </div>
            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="시작일"
                type="date"
                onChange={(e: any) => {
                  setStart(e.target.value);
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="종료일"
                type="date"
                onChange={(e: any) => {
                  setEnd(e.target.value);
                }}
              />
            </div>
            <Button
              type={"ghost"}
              disabled={!year || !term}
              onClick={() => {
                if (year && term) {
                  SeasonApi.CSeason({
                    data: {
                      school: props.schoolData._id,
                      year: year,
                      term: term,
                      period: {
                        start: start,
                        end: end,
                      },
                    },
                  })
                    .then(() => {
                      alert("success");
                      setIsLoading(true);
                      setAddSeasonPopupActive(false);
                    })
                    .catch((err) => alert(err.response.data.message));
                }
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
              }}
            >
              생성
            </Button>
          </div>
        </Popup>
      )}
      {editSeasonPopupActive && (
        <Popup
          closeBtn
          title={`${selectedSeason.year} ${selectedSeason.term}`}
          setState={setEditSeasonPopupActive}
          style={{ borderRadius: "8px", maxWidth: "800px", width: "100%" }}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": (
                <Basic
                  seasonData={selectedSeason}
                  setPopupActive={setEditSeasonPopupActive}
                  setIsLoading={setIsLoading}
                  setSeasonData={setSelectedSeason}
                />
              ),
              사용자: <Users seasonData={selectedSeason} />,
              교과목: (
                <Subject
                  seasonData={selectedSeason}
                  setSelectedSeason={setSelectedSeason}
                />
              ),
              강의실: (
                <Classroom
                  seasonData={selectedSeason}
                  setSelectedSeason={setSelectedSeason}
                />
              ),
              양식: (
                <Form
                  seasonData={selectedSeason}
                  setSelectedSeason={setSelectedSeason}
                />
              ),

              권한: (
                <Permission
                  seasonData={selectedSeason}
                  setSelectedSeason={setSelectedSeason}
                />
              ),
            }}
            align={"flex-start"}
          />
        </Popup>
      )}
    </div>
  );
};

export default Season;
