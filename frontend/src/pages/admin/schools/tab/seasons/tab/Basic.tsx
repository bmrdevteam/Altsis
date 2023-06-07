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
import useApi from "hooks/useApi";

import _ from "lodash";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  _id: string;
  setPopupActive: any;
  setIsLoading: any;
};

function Basic(props: Props) {
  const { SeasonApi } = useApi();
  const { SeasonAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* document fields */
  const [isActivated, setIsActivated] = useState<boolean>();
  const [isActivatedFirst, setIsActivatedFirst] = useState<boolean>();
  const [undefinedForms, setUndefinedForms] = useState<string[]>([]);
  const [period, setPeriod] = useState<any>({ start: "", end: "" });

  const setSeasonData = (seasonData: any) => {
    setIsActivated(seasonData.isActivated);
    setIsActivatedFirst(seasonData.isActivatedFirst);
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
            if (!season.formSyllabus) undefinedForms.push("강의 계획서");
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
                SeasonApi.USeason({
                  _id: props._id,
                  field: "period",
                  data: period,
                })
                  .then((res) => {
                    alert(SUCCESS_MESSAGE);
                    setSeasonData(res);
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
                          "정말 활성화하시겠습니까? 처음 활성화 이후에는 양식(시간표, 강의 계획서, 평가)을 수정할 수 없습니다."
                        )
                      : window.confirm(
                          `정말 활성화하시겠습니까? 양식(${_.join(
                            undefinedForms,
                            ", "
                          )})이 설정되지 않은 상태입니다. 처음 활성화 이후에는 양식(시간표, 강의 계획서, 평가)을 수정할 수 없습니다.`
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
