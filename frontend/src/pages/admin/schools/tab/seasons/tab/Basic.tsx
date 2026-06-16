/**
 * @file Seasons Page Tab Item - Basic
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
import { useState, useEffect } from "react";
import style from "style/pages/admin/schools.module.scss";

import _ from "lodash";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  _id: string;
  setPopupActive: any;
  setIsLoading: any;
};

function Basic(props: Props) {
  const { SeasonAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* document fields */
  const [isActivated, setIsActivated] = useState<boolean>();
  const [isActivatedFirst, setIsActivatedFirst] = useState<boolean>();
  const [undefinedForms, setUndefinedForms] = useState<string[]>([]);
  const [year, setYear] = useState<string>("");
  const [term, setTerm] = useState<string>("");
  const [period, setPeriod] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  const setSeasonData = (seasonData: any) => {
    setIsActivated(seasonData.isActivated);
    setIsActivatedFirst(seasonData.isActivatedFirst);
    setYear(seasonData.year ?? "");
    setTerm(seasonData.term ?? "");
    setPeriod(seasonData.period || { start: "", end: "" });
  };

  useEffect(() => {
    if (isLoading) {
      SeasonAPI.RSeason({ params: { _id: props._id } })
        .then(({ season }) => {
          setSeasonData(season);
          if (!season.isActivatedFirst) {
            const undefinedForms = [];
            if (!season.formTimetable) undefinedForms.push("시간표");
            if (!season.formSyllabus) undefinedForms.push("강의계획서");
            if (season.formEvaluation.length === 0) undefinedForms.push("평가");
            setUndefinedForms(undefinedForms);
          }
        })
        .then(() => setIsLoading(false));
    }
    return () => {};
  }, [isLoading]);

  return (
    <div>
      {!isLoading && (
        <div className={style.popup}>
          <div className={style.row} style={{ marginTop: "24px" }}>
            <Input
              key={`year-${year}`}
              style={{ maxHeight: "30px" }}
              type="text"
              label="학년도"
              appearence="flat"
              defaultValue={year}
              onChange={(e: any) => {
                setYear(e.target.value);
              }}
            />
            <Input
              key={`term-${term}`}
              style={{ maxHeight: "30px" }}
              type="text"
              label="학기명"
              appearence="flat"
              defaultValue={term}
              onChange={(e: any) => {
                setTerm(e.target.value);
              }}
            />

            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                marginTop: "24px",
              }}
              onClick={() => {
                if (
                  window.confirm("학년도와 학기명을 수정하시겠습니까?") !== true
                ) {
                  return;
                }
                SeasonAPI.USeasonBasic({
                  params: { _id: props._id },
                  data: {
                    year,
                    term,
                  },
                })
                  .then(({ season }) => {
                    alert(SUCCESS_MESSAGE);
                    setSeasonData(season);
                    props.setIsLoading(true);
                  })
                  .catch((err) => {
                    ALERT_ERROR(err);
                  });
              }}
            >
              수정
            </Button>
          </div>
          <div className={style.row} style={{ marginTop: "24px" }}>
            <Input
              style={{ maxHeight: "30px" }}
              type="date"
              label="학기 시작"
              appearence="flat"
              defaultValue={period.start}
              onChange={(e: any) => {
                setPeriod({ start: e.target.value, end: period.end });
              }}
            />
            <Input
              style={{ maxHeight: "30px" }}
              type="date"
              appearence="flat"
              label="학기 끝"
              defaultValue={period.end}
              onChange={(e: any) => {
                setPeriod({ start: period.start, end: e.target.value });
              }}
            />

            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                marginTop: "24px",
              }}
              onClick={() => {
                SeasonAPI.USeasonPeriod({
                  params: { _id: props._id },
                  data: {
                    start: period.start !== "" ? period.start : undefined,
                    end: period.end !== "" ? period.end : undefined,
                  },
                })
                  .then(({ season }) => {
                    alert(SUCCESS_MESSAGE);
                    setSeasonData(season);
                    props.setIsLoading(true);
                  })
                  .catch((err) => {
                    ALERT_ERROR(err);
                  });
              }}
            >
              수정
            </Button>
          </div>
          {!isActivated ? (
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                marginTop: "24px",
              }}
              onClick={() => {
                if (!isActivatedFirst) {
                  if (
                    undefinedForms.length === 0
                      ? window.confirm(
                          "정말 활성화하시겠습니까? 평가, 강의계획서, 시간표 데이터가 입력되면 해당 양식은 수정할 수 없습니다."
                        )
                      : window.confirm(
                          `정말 활성화하시겠습니까? 양식(${_.join(
                            undefinedForms,
                            ", "
                          )})이 설정되지 않은 상태입니다. 평가, 강의계획서, 시간표 데이터가 입력되면 해당 양식은 수정할 수 없습니다.`
                        )
                  ) {
                    SeasonAPI.UActivateSeason({ params: { _id: props._id } })
                      .then(({ season }) => {
                        alert(SUCCESS_MESSAGE);
                        setSeasonData(season);
                        props.setIsLoading(true);
                      })
                      .catch((err) => {
                        alert(err.response.data.message);
                      });
                  }
                } else {
                  if (window.confirm("정말 활성화하시겠습니까?") === true) {
                    SeasonAPI.UActivateSeason({ params: { _id: props._id } })
                      .then(({ season }) => {
                        alert(SUCCESS_MESSAGE);
                        setSeasonData(season);
                        props.setIsLoading(true);
                      })
                      .catch((err) => {
                        alert(err.response.data.message);
                      });
                  }
                }
              }}
            >
              {"활성화"}
            </Button>
          ) : (
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                marginTop: "24px",
              }}
              onClick={() => {
                if (window.confirm("정말 비활성화하시겠습니까?") === true) {
                  SeasonAPI.UInactivateSeason({ params: { _id: props._id } })
                    .then(({ season }) => {
                      alert(SUCCESS_MESSAGE);
                      setSeasonData(season);
                      props.setIsLoading(true);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }
              }}
            >
              {"비활성화"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default Basic;
