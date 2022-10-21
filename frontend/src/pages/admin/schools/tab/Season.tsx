import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../../../components/button/Button";
import Input from "../../../../components/input/Input";
import Popup from "../../../../components/popup/Popup";
import Select from "../../../../components/select/Select";
import Table from "../../../../components/table/Table";
import useDatabase from "../../../../hooks/useDatabase";
import style from "../../../../style/pages/admin/schools/schools.module.scss";

type Props = {};

const Season = (props: Props) => {
  const navigate = useNavigate();
  const database = useDatabase();
  const { pid } = useParams();

  const [seasons, setSeasons] = useState();
  const [selectedSeason, setSelectedSeason] = useState<any>();

  const [selectedYear, setSelectedYear] = useState();
  const [termName, setTermName] = useState<string>();

  console.log(seasons);

  const [addSeasonPopupActive, setAddSeasonPopupActive] =
    useState<boolean>(false);
  const [editSeasonPopupActive, setEditSeasonPopupActive] =
    useState<boolean>(false);
  async function getSeasons() {
    const { seasons: result } = await database.R({
      location: `seasons?schoolId=${pid}`,
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
    let result = [];
    console.log(subjectObj);
    for (let i = 0; i < subjectObj.data.length; i++) {
      const obj = {};
      for (let index = 0; index < subjectObj.label.length; index++) {
        Object.defineProperty(obj, subjectObj.label[index], {
          value: subjectObj.data[i][index],
          writable: false,
        });
      }
      result.push(obj);
    }
    console.log(result);

  }

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
          style={{ borderRadius: "8px", maxWidth: "800px", width: "100%" }}
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
                inputStyle="flat"
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
              styles={{
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
          style={{ borderRadius: "8px", maxWidth: "800px", width: "100%" }}
        >
          <div className={style.popup}>
            <div className={style.title}>기본 정보</div>
            <div className={style.row}>
              <Select
                style={{ minHeight: "30px" }}
                label="년도 선택"
                defaultSelected={parseInt(selectedSeason.year) - 2000}
                required
                options={years()}
                appearence={"flat"}
              />
              <Input
                style={{ maxHeight: "30px" }}
                defaultValue={selectedSeason.term}
                inputStyle="flat"
                label="학기"
                onChange={(e: any) => {
                  setTermName(e.target.value);
                }}
                required
              />
            </div>
            <div className={style.title}>교과 과목</div>
            <div className={style.tree}>
              {subjects(selectedSeason.subjects)}
            </div>
            <Button
              type={"ghost"}
              disableOnclick
              onClick={() => {}}
              styles={{
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
    </div>
  );
};

export default Season;
