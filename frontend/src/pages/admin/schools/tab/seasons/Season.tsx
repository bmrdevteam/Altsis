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
import Table from "components/table/Table";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Tree from "components/tree/Tree";
import useDatabase from "hooks/useDatabase";
import style from "style/pages/admin/schools.module.scss";
import Basic from "./tab/Basic";
import Classroom from "./tab/Classroom";
import Form from "./tab/Form";
import Permission from "./tab/Permission";
import Subjects from "./tab/Subjects";
import Users from "./tab/Users";

type Props = {};

const Season = (props: Props) => {
  const database = useDatabase();

  const { pid } = useParams();

  const [seasons, setSeasons] = useState();
  const [selectedSeason, setSelectedSeason] = useState<any>();

  const [selectedYear, setSelectedYear] = useState();
  const [termName, setTermName] = useState<string>();

  const [addSeasonPopupActive, setAddSeasonPopupActive] =
    useState<boolean>(false);
  const [editSeasonPopupActive, setEditSeasonPopupActive] =
    useState<boolean>(false);

  /**
   *
   * @returns seasons from the database
   */
  async function getSeasons() {
    const { seasons: result } = await database.R({
      location: `seasons?schoolId=bmrhs`,
    });
    return result;
  }
  async function getSelectedSeason(id: string) {
    const result = await database.R({ location: `seasons/${id}` });
    return result;
  }

  async function addSeason() {
    const result = await database.C({
      location: `seasons`,
      data: {
        schoolId: pid,
        year: selectedYear,
        term: termName,
      },
    });
    return result;
  }

  useEffect(() => {
    getSeasons().then((res) => {
      console.log(res);

      setSeasons(res);
    });
  }, []);

  const years = () => {
    let result: { text: string; value: number }[] = [];
    const date = new Date();
    const currentYear = date.getFullYear();

    for (let i = 2000; i < currentYear + 50; i++) {
      result.push({ text: i.toString(), value: i });
    }

    return result;
  };
  function subjects(subjectObj: any) {
    const unique: any = Array.from(
      new Set(subjectObj.data.map((val: any) => val[0]))
    );
    let sub1: any = {};
    for (let i = 0; i < unique.length; i++) {
      sub1[unique[i]] = Array.from(
        new Set(
          subjectObj.data
            .filter((val: any) => val[0] === unique[i])
            .map((val: string[]) => val[1])
        )
      );
    }
    let sub2: any = {};
    for (let i = 0; i < unique.length; i++) {
      for (let index = 0; index < sub1[unique[i]].length; index++) {
        sub2[`${unique[i]}/${sub1[unique[i]][index]}`] = Array.from(
          new Set(
            subjectObj.data
              .filter(
                (val: any) =>
                  val[0] === unique[i] && val[1] === sub1[unique[i]][index]
              )
              .map((val: string[]) => val[2])
          )
        );
      }
    }
    return [unique, sub1, sub2];
  }

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
          data={seasons}
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
              text: "학년도",
              key: "year",
              type: "string",
            },
            {
              text: "학기",
              key: "term",
              type: "string",
            },
            {
              text: "자세히",
              key: "_id",
              type: "button",
              onClick: (e: any) => {
                getSelectedSeason(e.target.dataset.value).then((res) => {
                  setSelectedSeason(res);
                  setEditSeasonPopupActive(true);
                  console.log(res);
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
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"학기 추가"}
        >
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <Select
                style={{ minHeight: "30px" }}
                label="년도 선택"
                defaultSelected={new Date().getFullYear() - 2000}
                required
                options={years()}
                setValue={setSelectedYear}
                appearence={"flat"}
              />
              <Input
                style={{ maxHeight: "30px" }}
                appearence="flat"
                label="학기"
                onChange={(e: any) => {
                  setTermName(e.target.value);
                }}
                required
              />
            </div>
            <div style={{ height: "24px" }}></div>
            <Button
              type={"ghost"}
              disableOnclick
              disabled={!selectedYear || !termName}
              onClick={() => {
                addSeason().then((res) => {
                  setAddSeasonPopupActive(false);
                });
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              저장
            </Button>
          </div>
        </Popup>
      )}
      {editSeasonPopupActive && (
        <Popup
          closeBtn
          title="학기 편집"
          setState={setEditSeasonPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": <Basic seasonData={selectedSeason} />,
              강의실: <Classroom seasonData={selectedSeason} />,
              "교과 과목": <Subjects seasonData={selectedSeason} />,
              양식: <Form seasonData={selectedSeason} />,
              시용자: <Users seasonData={selectedSeason} />,
              권한: <Permission seasonData={selectedSeason} />,
            }}
            align={"flex-start"}
          />
        </Popup>
      )}
    </div>
  );
};

export default Season;
