/**
 * @file Seasons Page Tab Item - Form
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
import Table from "components/table/Table";
import useDatabase from "hooks/useDatabase";
import React, { useEffect } from "react";
import { useState } from "react";
import style from "style/pages/admin/schools.module.scss";
type Props = {
  seasonData: any;
};
const Form = (props: Props) => {
  const database = useDatabase();
  const [selectFormPopupActive, setSelectFormPopupActive] =
    useState<boolean>(false);
  const [selectFormType, setSelectFormType] = useState<string>();
  const [forms, setForms] = useState<any>();
  const [season, setSeason] = useState<any>();

  async function getForms() {
    const { forms: result } = await database.R({ location: "forms" });
    return result;
  }
  async function getForm(id: string) {
    const result = await database.R({ location: `forms/${id}` });
    return result;
  }
  async function getSeason() {
    const result = await database.R({
      location: `seasons/${props.seasonData._id}`,
    });
    return result;
  }

  async function updateSeasonFormTimetable(data: any) {
    const result = await database.U({
      location: `seasons/${props.seasonData._id}/form/timetable`,
      data: { new: data },
    });
    return result;
  }
  async function updateSeasonFormSyllabus(data: any) {
    const result = await database.U({
      location: `seasons/${props.seasonData._id}/form/syllabus`,
      data: { new: data },
    });
    return result;
  }
  async function updateSeasonFormEvaluation(data: any) {
    const result = await database.U({
      location: `seasons/${props.seasonData._id}/form/evaluation`,
      data: { new: data },
    });
    return result;
  }
  useEffect(() => {
    getForms().then((res) => {
      console.log(res);
      setForms(res);
    });
    getSeason().then((res) => {
      setSeason(res);
    });
  }, []);

  return (
    <>
      <div className={style.form}>
        <div className={style.item}>
          <div className={style.title}>시간표 양식</div>

          <Button
            style={{ marginTop: "12px" }}
            type="ghost"
            onClick={() => {
              setSelectFormType("timetable");
              setSelectFormPopupActive(true);
            }}
          >
            {season?.formTimetable?.title ?? "선택"}
          </Button>
        </div>
        <div className={style.item}>
          <div className={style.title}>강의 계획서 양식</div>
          <Button
            style={{ marginTop: "12px" }}
            type="ghost"
            onClick={() => {
              setSelectFormType("syllabus");
              setSelectFormPopupActive(true);
            }}
          >
            {season?.formSyllabus?.title ?? "선택"}
          </Button>
        </div>
        <div className={style.item}>
          <div className={style.title}>평가 양식</div>
          <Button
            style={{ marginTop: "12px" }}
            type="ghost"
            onClick={() => {
              setSelectFormType("evaluation");
              setSelectFormPopupActive(true);
            }}
          >
            {season?.formEvaluation?.title ?? "선택"}
          </Button>
        </div>
      </div>
      {selectFormPopupActive && (
        <Popup
          style={{ borderRadius: "4px", maxWidth: "600px", width: "100%" }}
          title={`${
            selectFormType === "timetable"
              ? "시간표"
              : selectFormType === "syllabus"
              ? "강의계획서"
              : "평가"
          } 양식 선택`}
          setState={setSelectFormPopupActive}
          closeBtn
        >
          <Table
            type="object-array"
            data={forms?.filter((val: any) => val.type === selectFormType)}
            header={[
              { text: "제목", key: "title", type: "string" },
              { text: "종류", key: "type", type: "string" },
              {
                text: "선택",
                key: "_id",
                type: "button",
                onClick: (e: any) => {
                  const id = e.target.dataset.value;

                  getForm(id).then((res) => {
                    switch (selectFormType) {
                      case "timetable":
                        updateSeasonFormTimetable(res).then(() => {
                          getSeason().then((res) => {
                            setSeason(res);
                          });
                        });
                        setSelectFormPopupActive(false);
                        break;
                      case "syllabus":
                        updateSeasonFormSyllabus(res).then(() => {
                          getSeason().then((res) => {
                            setSeason(res);
                          });
                        });
                        setSelectFormPopupActive(false);
                        break;
                      case "evaluation":
                        updateSeasonFormEvaluation(res).then(() => {
                          getSeason().then((res) => {
                            setSeason(res);
                          });
                        });
                        setSelectFormPopupActive(false);
                        break;
                      default:
                        break;
                    }
                  });
                },
                width: "80px",
                align: "center",
                textStyle: {
                  padding: "0 10px",
                  border: "var(--border-default)",
                  background: "rgba(200, 200, 255, 0.25)",
                  borderColor: "rgba(200, 200, 255)",
                },
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
};

export default Form;
