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
import { useState } from "react";
import style from "style/pages/admin/schools.module.scss";
import useApi from "hooks/useApi";

import _ from "lodash";

type Props = {
  seasonData: any;
  setPopupActive: any;
  setIsLoading: any;
  setSeasonData: any;
};

function Basic(props: Props) {
  const { SeasonApi } = useApi();

  /* document fields */
  const [isActivated, setIsActivated] = useState<boolean>(
    props.seasonData.isActivated
  );
  const [isActivatedFirst, setIsActivatedFirst] = useState<boolean>(
    props.seasonData.isActivatedFirst
  );

  const [period, setPeriod] = useState<any>(
    props.seasonData?.period || { start: "", end: "" }
  );

  return (
    <div>
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
                _id: props.seasonData._id,
                field: "period",
                data: { start: period.start, end: period.end },
              })
                .then((res) => {
                  alert("success");
                  props.seasonData.period = res;
                  props.setSeasonData(props.seasonData);
                  console.log("res is ", res);
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
              const undefinedForms = [];
              if (!props.seasonData.formTimetable)
                undefinedForms.push("시간표");
              if (!props.seasonData.formSyllabus)
                undefinedForms.push("강의 계획서");
              if (props.seasonData.formEvaluation.length === 0)
                undefinedForms.push("평가");

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
                SeasonApi.UActivateSeason(props.seasonData._id)
                  .then(() => {
                    alert("success");
                    setIsActivated(true);
                    setIsActivatedFirst(true);
                    props.setSeasonData({
                      ...props.seasonData,
                      isActivated: true,
                      isActivatedFirst: true,
                    });
                    props.setIsLoading(true);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }
            } else if (isActivated) {
              if (window.confirm("정말 비활성화하시겠습니까?") === true) {
                SeasonApi.UInactivateSeason(props.seasonData._id)
                  .then(() => {
                    alert("success");
                    setIsActivated(false);
                    props.setIsLoading(true);
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }
            } else {
              if (window.confirm("정말 활성화하시겠습니까?") === true) {
                SeasonApi.UActivateSeason(props.seasonData._id)
                  .then(() => {
                    alert("success");
                    setIsActivated(true);
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
                SeasonApi.DSeason(props.seasonData._id)
                  .then((res) => {
                    alert("success");
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
    </div>
  );
}

export default Basic;
