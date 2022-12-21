/**
 * @file Season Page Tab Item - Basic
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

import { useState } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import { dateFormat } from "functions/functions";

type Props = {
  academy: string;
  seasonData: any;
};

function Basic(props: Props) {
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* document fields */
  const [isActivated, setIsActivated] = useState<boolean>(
    props.seasonData.isActivated
  );
  const [year, setYear] = useState<string>(props.seasonData.year);
  const [term, setTerm] = useState<string>(props.seasonData.term);
  const [start, setStart] = useState<string>(
    props.seasonData?.period?.start ?? ""
  );
  const [end, setEnd] = useState<string>(props.seasonData?.period?.end ?? "");

  async function activateSeason() {
    if (window.confirm("정말 활성화하시겠습니까?") === true) {
      // 확인
      const result = await database.C({
        location: `academies/${props.academy}/seasons/${props.seasonData._id}/activate`,
        data: {},
      });
      return result;
    }
    // 취소
    return false;
  }

  async function inactivateSeason() {
    if (window.confirm("정말 비활성화하시겠습니까?") === true) {
      // 확인
      const result = await database.C({
        location: `academies/${props.academy}/seasons/${props.seasonData._id}/inactivate`,
        data: {},
      });
      return result;
    }
    // 취소
    return false;
  }

  async function updateSeason() {
    const result = database.U({
      location: `academies/${props.academy}/seasons/${props.seasonData._id}`,
      data: {
        year,
        term,
        period: {
          start: start,
          end: end,
        },
      },
    });
    return result;
  }

  return (
    <div>
      <div className={style.popup}>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            type="date"
            label="학기 시작"
            appearence="flat"
            defaultValue={props.seasonData.period?.start}
            onChange={(e: any) => {
              setStart(e.target.value);
            }}
          />
          <Input
            style={{ maxHeight: "30px" }}
            type="date"
            appearence="flat"
            label="학기 끝"
            defaultValue={props.seasonData.period?.end}
            onChange={(e: any) => {
              setEnd(e.target.value);
            }}
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={dateFormat(new Date(props.seasonData.createdAt))}
            appearence="flat"
            label="createdAt"
            disabled
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={dateFormat(new Date(props.seasonData.updatedAt))}
            appearence="flat"
            label="updatedAt"
            disabled
          />
        </div>

        <Button
          type={"ghost"}
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            updateSeason()
              .then(() => {
                alert("success");
              })
              .catch((err) => {
                console.log(err);
                alert(err.response.data.message);
              });
            setIsLoading(false);
          }}
          style={{
            borderRadius: "4px",
            marginTop: "24px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          저장
        </Button>
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            marginTop: "12px",
          }}
          onClick={() => {
            if (isActivated) {
              inactivateSeason()
                .then((res) => {
                  if (res) {
                    alert("success");
                    setIsActivated(false);
                  }
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            } else {
              activateSeason()
                .then((res) => {
                  if (res) {
                    alert("success");
                    setIsActivated(true);
                  }
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }
          }}
        >
          {isActivated ? "비활성화" : "활성화"}
        </Button>
      </div>
    </div>
  );
}

export default Basic;
