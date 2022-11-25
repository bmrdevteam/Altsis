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

type Props = {
  academy: string;
  seasonData: any;
};

function Basic(props: Props) {
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* additional document list */
  const [schoolList, setSchoolList] = useState<any>();
  const [school, setSchool] = useState<any>();

  /* document fields */
  const [year, setYear] = useState<string>(props.seasonData.year);
  const [term, setTerm] = useState<string>(props.seasonData.term);
  const [start, setStart] = useState<string>(
    props.seasonData?.period?.start ?? ""
  );
  const [end, setEnd] = useState<string>(props.seasonData?.period?.end ?? "");

  async function updateSeason() {
    const result = database.U({
      location: `seasons/${props.seasonData._id}`,
      data: {
        school: schoolList[school]._id,
        schoolId: schoolList[school].schoolId,
        schoolName: schoolList[school].schoolName,
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
            defaultValue={props.seasonData.schoolId}
            appearence="flat"
            label="학교 ID"
            required
            disabled
          />
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.seasonData.schoolName}
            appearence="flat"
            label="학교 이름"
            required
            disabled
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            disabled
            defaultValue={props.seasonData.year}
            appearence="flat"
            label="학년도"
            required
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.seasonData.term}
            disabled
            appearence="flat"
            label="학기"
            onChange={(e: any) => {
              setTerm(e.target.value);
            }}
            required
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            type="date"
            label="start"
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
            label="end"
            defaultValue={props.seasonData.period?.end}
            onChange={(e: any) => {
              setEnd(e.target.value);
            }}
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.seasonData.createdAt}
            appearence="flat"
            label="createdAt"
            disabled
          />
        </div>
        <div className={style.row}>
          <Input
            style={{ maxHeight: "30px" }}
            defaultValue={props.seasonData.updatedAt}
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
          수정하기
        </Button>
      </div>
    </div>
  );
}

export default Basic;
