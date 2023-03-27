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

type Props = {
  _id: string;
  setPopupActive: any;
  setIsLoading: any;
};

function Basic(props: Props) {
  const { SeasonApi } = useApi();
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
      SeasonApi.RSeason(props._id)
        .then((res) => {
          setSeasonData(res);
          if (!res.isActivatedFirst) {
            const undefinedForms = [];
            if (!res.formTimetable) undefinedForms.push("시간표");
            if (!res.formSyllabus) undefinedForms.push("강의 계획서");
            if (res.formEvaluation.length === 0) undefinedForms.push("평가");
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
                    alert(err.reponse.data.message);
                  });
              }}
            >
              수정
            </Button>
          </div>

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
                  SeasonApi.UActivateSeason(props._id)
                    .then((res) => {
                      alert(SUCCESS_MESSAGE);
                      setSeasonData(res);
                      props.setIsLoading(true);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }
              } else if (isActivated) {
                if (window.confirm("정말 비활성화하시겠습니까?") === true) {
                  SeasonApi.UInactivateSeason(props._id)
                    .then((res) => {
                      alert(SUCCESS_MESSAGE);
                      setSeasonData(res);
                      props.setIsLoading(true);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }
              } else {
                if (window.confirm("정말 활성화하시겠습니까?") === true) {
                  SeasonApi.UActivateSeason(props._id)
                    .then((res) => {
                      alert(SUCCESS_MESSAGE);
                      setSeasonData(res);
                      props.setIsLoading(true);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }
              }
            }}
          >
            {isActivated ? "비활성화" : "활성화"}
          </Button>
          {!isActivated && (
            <Button
              type={"ghost"}
              onClick={() => {
                if (window.confirm("정말 삭제하시겠습니까?") === true) {
                  SeasonApi.DSeason(props._id)
                    .then((res) => {
                      alert(SUCCESS_MESSAGE);
                      props.setIsLoading(true);
                      props.setPopupActive(false);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                }
              }}
              style={{
                borderRadius: "4px",
                marginTop: "12px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              삭제
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default Basic;
