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
import Subject from "./tab/Subject";
import Users from "./tab/Users";

import { useAuth } from "contexts/authContext";

type Props = {};

const Season = (props: Props) => {
  const database = useDatabase();

  const { pid } = useParams();
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

  /**
   *
   * @returns seasons from the database
   */
  async function getSeasons() {
    const { seasons: result } = await database.R({
      location: `seasons?school=${pid}`,
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
        school: pid,
        year: year,
        term: term,
        period: {
          start: start,
          end: end,
        },
      },
    });
    return result;
  }

  useEffect(() => {
    if (isLoading) {
      getSeasons()
        .then((res) => {
          console.log(res);

          setSeasons(res);
          setIsLoading(false);
        })
        .catch((err) => alert(err.response.data.message));
    }
  }, [isLoading]);

  const years = () => {
    let result: { text: string; value: number }[] = [];
    const date = new Date();
    const currentYear = date.getFullYear();

    for (let i = 2000; i < currentYear + 50; i++) {
      result.push({ text: i.toString(), value: i });
    }

    return result;
  };
  // function subjects(subjectObj: any) {
  //   const unique: any = Array.from(
  //     new Set(subjectObj.data.map((val: any) => val[0]))
  //   );
  //   let sub1: any = {};
  //   for (let i = 0; i < unique.length; i++) {
  //     sub1[unique[i]] = Array.from(
  //       new Set(
  //         subjectObj.data
  //           .filter((val: any) => val[0] === unique[i])
  //           .map((val: string[]) => val[1])
  //       )
  //     );
  //   }
  //   let sub2: any = {};
  //   for (let i = 0; i < unique.length; i++) {
  //     for (let index = 0; index < sub1[unique[i]].length; index++) {
  //       sub2[`${unique[i]}/${sub1[unique[i]][index]}`] = Array.from(
  //         new Set(
  //           subjectObj.data
  //             .filter(
  //               (val: any) =>
  //                 val[0] === unique[i] && val[1] === sub1[unique[i]][index]
  //             )
  //             .map((val: string[]) => val[2])
  //         )
  //       );
  //     }
  //   }
  //   return [unique, sub1, sub2];
  // }

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
          data={seasons?.sort((a, b) => {
            return (
              new Date(b.period?.start).getTime() -
              new Date(a.period?.start).getTime()
            );
          })}
          header={[
            {
              text: "ID",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
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
              text: "period",
              key: "period",
              type: "string",
              returnFunction: (value) => {
                if ((value?.start || value?.end) === undefined) {
                  return "없음";
                }
                return `${value?.start} ~ ${value?.end}`;
              },
            },
            {
              text: "상태",
              key: "isActivated",
              type: "string",

              returnFunction: (e: boolean) => {
                return e ? "활성화됨" : "비활성화됨";
              },
            },
            {
              text: "자세히",
              key: "_id",
              type: "button",
              onClick: (e: any) => {
                getSelectedSeason(e._id).then((res) => {
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
                addSeason()
                  .then((res) => {
                    alert("success");
                    setIsLoading(true);
                    setAddSeasonPopupActive(false);
                  })
                  .catch((err) => alert(err.response.data.message));
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
                  setIsLoading={setIsLoading}
                />
              ),
              교과목: <Subject seasonData={selectedSeason} />,
              강의실: <Classroom seasonData={selectedSeason} />,
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
