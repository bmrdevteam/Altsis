/**
 * @file Seasons Page Tab Item - Form
 *
 * @author jessie129j <jessie129j@gmail.com>
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
import { useEffect, useRef, useState } from "react";

// components
import Button from "components/button/Button";

import style from "style/pages/admin/schools.module.scss";
import useAPIv2 from "hooks/useAPIv2";
import { TFormEvaluation, TFormTimetable, TSeason } from "types/seasons";

import EditTimetablePopup from "./EditTimetablePopup";
import EditSyllabusPopup from "./EditSyllabusPopup";
import EditEvaluationTable from "./EditEvaluationTable";

type Props = {
  _id: string;
};

const Form = (props: Props) => {
  const { SeasonAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isActivatedFirst, setIsActivatedFirst] = useState<boolean>(true);

  const [formTimetable, setFormTimetable] = useState<TFormTimetable>();
  const [formSyllabus, setFormSyllabus] = useState<any>();
  const [formEvaluation, setFormEvaluation] = useState<TFormEvaluation>([]);

  const [formTimetablePopupActive, setFormTimetablePopupActive] =
    useState<boolean>(false);
  const [formSyllabusPopupActive, setFormSyllabusPopupActive] =
    useState<boolean>(false);

  const updateFormData = (seasonData: TSeason) => {
    setFormSyllabus(seasonData?.formSyllabus);
    setFormTimetable(seasonData?.formTimetable);
    setFormEvaluation(seasonData?.formEvaluation ?? []);
    setIsActivatedFirst(seasonData.isActivatedFirst);
  };

  useEffect(() => {
    if (isLoading) {
      SeasonAPI.RSeason({ params: { _id: props._id } })
        .then(({ season }) => {
          updateFormData(season);
        })
        .then(() => setIsLoading(false));
    }
    return () => {};
  }, [isLoading]);

  return !isLoading ? (
    <>
      <div>
        <div className={style.form} style={{ marginTop: "24px" }}>
          <div className={style.item}>
            <div className={style.title}>시간표 양식</div>

            <Button
              type="ghost"
              onClick={() => {
                setFormTimetablePopupActive(true);
              }}
              disabled={isActivatedFirst}
            >
              {formTimetable?.title ?? (isActivatedFirst ? "없음" : "선택")}
            </Button>
          </div>
          <div className={style.item}>
            <div className={style.title}>강의 계획서 양식</div>
            <Button
              type="ghost"
              onClick={() => {
                setFormSyllabusPopupActive(true);
              }}
              disabled={isActivatedFirst}
            >
              {!isLoading &&
                (formSyllabus?.title ?? (isActivatedFirst ? "없음" : "선택"))}
            </Button>
          </div>
        </div>
        <div className={style.form} style={{ marginTop: "24px" }}>
          <div className={style.item}>
            <div
              className={style.title}
              style={{
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              평가 양식
            </div>
            <EditEvaluationTable
              _id={props._id}
              setPopupActive={setFormTimetablePopupActive}
              formEvaluation={formEvaluation}
              updateFormData={updateFormData}
              isActivatedFirst={isActivatedFirst}
            />
          </div>
        </div>
      </div>
      {formTimetablePopupActive && (
        <EditTimetablePopup
          _id={props._id}
          setPopupActive={setFormTimetablePopupActive}
          updateFormData={updateFormData}
        />
      )}
      {formSyllabusPopupActive && (
        <EditSyllabusPopup
          _id={props._id}
          setPopupActive={setFormSyllabusPopupActive}
          updateFormData={updateFormData}
        />
      )}
    </>
  ) : (
    <></>
  );
};

export default Form;
