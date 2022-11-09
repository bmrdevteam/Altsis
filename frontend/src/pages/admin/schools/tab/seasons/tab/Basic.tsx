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
import Select from "components/select/Select";
import useDatabase from "hooks/useDatabase";
import { useState } from "react";
import style from "style/pages/admin/schools.module.scss";

type Props = {
  seasonData: any;
};

function Basic(props: Props) {
  const database = useDatabase();
  const [seasonYear, setSeasonYear] = useState<string>(props.seasonData.year);
  const [seasonTerm, setSeasonTerm] = useState<string>(props.seasonData.term);
  const [seasonStart, setSeasonStart] = useState<string>(
    props.seasonData?.period?.start ?? ""
  );
  const [seasonEnd, setSeasonEnd] = useState<string>(
    props.seasonData?.period?.end ?? ""
  );
  const [databaseLoading, setDatabaseLoading] = useState<boolean>(false);

  async function updateSeason() {
    const result = database.U({
      location: `seasons/${props.seasonData._id}/period`,
      data: {
        new: {
          start: seasonStart,
          end: seasonEnd,
        },
      },
    });
    return result;
  }

  const years = () => {
    let result: { text: string; value: number }[] = [];
    const date = new Date();
    const currentYear = date.getFullYear();

    for (let i = 2000; i < currentYear + 50; i++) {
      result.push({ text: i.toString(), value: i });
    }

    return result;
  };
  return (
    <div>
      <div className={style.popup}>
        <div className={style.row}>
          {/* <Select
            style={{ minHeight: "30px" }}
            label="년도 선택"
            defaultSelectedValue={seasonYear}
            required
            options={years()}
            appearence={"flat"}
            onChange={(e: any) => {
              setSeasonYear(e.target.value);
            }}
          /> */}

          <Input
            style={{ maxHeight: "30px" }}
            disabled
            defaultValue={seasonYear}
            appearence="flat"
            label="년도 선택"
            required
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={seasonTerm}
            disabled
            appearence="flat"
            label="학기"
            onChange={(e: any) => {
              setSeasonTerm(e.target.value);
            }}
            required
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            type="date"
            label="학기 시작"
            appearence="flat"
            defaultValue={seasonStart}
            onChange={(e: any) => {
              setSeasonStart(e.target.value);
            }}
            required
          />
          <Input
            style={{ maxHeight: "30px" }}
            type="date"
            appearence="flat"
            label="학기 끝"
            defaultValue={seasonEnd}
            onChange={(e: any) => {
              setSeasonEnd(e.target.value);
            }}
            required
          />
        </div>
        <Button
          type={"ghost"}
          disabled={databaseLoading}
          onClick={() => {
            setDatabaseLoading(true);
            updateSeason()
              .then(() => {
                setDatabaseLoading(false);
              })
              .catch(() => {
                setDatabaseLoading(false);
              });
          }}
          style={{
            borderRadius: "4px",
            marginTop: "24px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
        >
          {databaseLoading ? "저장중" : "저장"}
        </Button>
      </div>
    </div>
  );
}

export default Basic;
