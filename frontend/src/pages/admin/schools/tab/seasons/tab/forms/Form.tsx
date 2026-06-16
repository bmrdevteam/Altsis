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
import { useEffect, useState } from "react";

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

  const [formTimetable, setFormTimetable] = useState<TFormTimetable>();
  const [formSyllabus, setFormSyllabus] = useState<any>();
  const [formEvaluation, setFormEvaluation] = useState<TFormEvaluation>([]);
  const [formUsage, setFormUsage] = useState<{
    evaluation: boolean;
    syllabus: boolean;
    timetable: boolean;
  }>({
    evaluation: false,
    syllabus: false,
    timetable: false,
  });

  const [formTimetablePopupActive, setFormTimetablePopupActive] =
    useState<boolean>(false);
  const [formSyllabusPopupActive, setFormSyllabusPopupActive] =
    useState<boolean>(false);

  const updateFormData = (seasonData: TSeason) => {
    setFormSyllabus(seasonData?.formSyllabus);
    setFormTimetable(seasonData?.formTimetable);
    setFormEvaluation(seasonData?.formEvaluation ?? []);
  };

  useEffect(() => {
    if (isLoading) {
      Promise.all([
        SeasonAPI.RSeason({ params: { _id: props._id } }),
        SeasonAPI.RSeasonFormUsage({ params: { _id: props._id } }),
      ])
        .then(([{ season }, { usage }]) => {
          updateFormData(season);
          setFormUsage(usage);
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
              disabled={formUsage.timetable}
            >
              {formTimetable?.title ?? "선택"}
            </Button>
            {formUsage.timetable && (
              <div style={{ marginTop: "8px", fontSize: "12px" }}>
                시간표 데이터가 있어 수정할 수 없습니다.
              </div>
            )}
          </div>
          <div className={style.item}>
            <div className={style.title}>강의계획서 양식</div>
            <Button
              type="ghost"
              onClick={() => {
                setFormSyllabusPopupActive(true);
              }}
              disabled={formUsage.syllabus}
            >
              {!isLoading && (formSyllabus?.title ?? "선택")}
            </Button>
            {formUsage.syllabus && (
              <div style={{ marginTop: "8px", fontSize: "12px" }}>
                강의계획서 데이터가 있어 수정할 수 없습니다.
              </div>
            )}
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
              isLocked={formUsage.evaluation}
            />
            {formUsage.evaluation && (
              <div style={{ marginTop: "8px", fontSize: "12px" }}>
                평가 데이터가 있어 수정할 수 없습니다.
              </div>
            )}
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
