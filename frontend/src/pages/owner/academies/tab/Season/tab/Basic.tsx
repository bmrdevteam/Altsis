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

import style from "style/pages/admin/schools.module.scss";

// components
import Input from "components/input/Input";

type Props = {
  seasonData: any;
};

function Basic(props: Props) {
  return (
    <div className={style.popup}>
      <div className={style.row} style={{ marginTop: "24px" }}>
        <Input
          style={{ maxHeight: "30px" }}
          type="string"
          label="상태"
          appearence="flat"
          defaultValue={
            props.seasonData.isActivated ? "활성화됨" : "비활성화됨"
          }
          disabled
        />
      </div>
      <div className={style.row} style={{ marginTop: "24px" }}>
        <Input
          style={{ maxHeight: "30px" }}
          type="date"
          label="학기 시작"
          appearence="flat"
          defaultValue={props.seasonData.period?.start}
          disabled
        />
        <Input
          style={{ maxHeight: "30px" }}
          type="date"
          appearence="flat"
          label="학기 끝"
          defaultValue={props.seasonData.period?.end}
          disabled
        />
      </div>
    </div>
  );
}

export default Basic;
